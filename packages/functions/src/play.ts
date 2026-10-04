import { Timestamp } from 'firebase-admin/firestore';
import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { applyMove, forfeit, IllegalMoveError, parseMove, TURN_TIMEOUT_MS } from '@gld/engine';
import type { GameState, SecretState, Seat } from '@gld/engine';
import { fail } from './errors.js';
import { endGameWrites, seatInfo, secretWrites, startGameWrites, userUpsert } from './games.js';
import type { StoredGame } from './games.js';
import { GameInput, MoveInput, parseInput } from './input.js';
import { refs } from './paths.js';
import type { Ctx } from './paths.js';
import { runLimited } from './rateLimit.js';

function requireSeat(game: StoredGame | undefined, uid: string): { game: StoredGame; seat: Seat } {
  if (!game) return fail('not-found', 'room-not-found');
  const seat = game.playerUids.indexOf(uid);
  if (seat === -1) return fail('permission-denied', 'not-a-player');
  return { game, seat: seat as Seat };
}

/**
 * Applique un coup dans une transaction : authentification et appartenance au salon, tour du
 * joueur, version attendue (concurrence optimiste), légalité via le moteur. Un même `moveId`
 * rejoué après succès renvoie le résultat sans réappliquer le coup (idempotence).
 */
export async function submitMove(
  db: Firestore,
  ctx: Ctx,
  data: unknown,
): Promise<{ version: number }> {
  const input = parseInput(MoveInput, data);
  const move = parseMove(input.move) ?? fail('invalid-argument', 'invalid-input');
  return runLimited(db, ctx, 'move', async (tx) => {
    const gameRef = refs(db).game(input.gameId);
    const secretRef = refs(db).secret(input.gameId);
    const [gameSnap, secretSnap] = (await tx.getAll(gameRef, secretRef)) as [
      DocumentSnapshot,
      DocumentSnapshot,
    ];
    const { game, seat } = requireSeat(gameSnap.data() as StoredGame | undefined, ctx.uid);

    if (game.lastMove?.id === input.moveId && game.lastMove.seat === seat) {
      return { version: game.lastMove.version };
    }
    if (game.status !== 'playing' || !game.state)
      return fail('failed-precondition', 'game-not-active');
    if (game.version !== input.expectedVersion) {
      return fail('aborted', 'stale-version', { version: game.version });
    }
    if (game.state.current !== seat) return fail('failed-precondition', 'not-your-turn');
    const sec = secretSnap.get('sec') as SecretState | undefined;
    if (!sec) throw new Error(`Secrets manquants pour la partie ${input.gameId}`);

    const before: GameState = { pub: game.state, sec };
    let after: GameState;
    try {
      after = applyMove(before, seat, move);
    } catch (error) {
      if (error instanceof IllegalMoveError) {
        return fail('failed-precondition', 'illegal-move', { rule: error.reason });
      }
      throw error;
    }

    const version = game.version + 1;
    secretWrites(db, tx, input.gameId, game, before, after);
    const update: Partial<StoredGame> = {
      state: after.pub,
      version,
      updatedAt: Timestamp.fromMillis(ctx.now),
      turnDeadline: Timestamp.fromMillis(ctx.now + TURN_TIMEOUT_MS),
      lastMove: { id: input.moveId, seat, version },
    };
    if (after.pub.winner !== null) {
      Object.assign(update, endGameWrites(db, tx, input.gameId, game, after.pub, ctx.now));
    }
    tx.update(gameRef, update);
    return { version };
  });
}

/** L'adversaire réclame la victoire quand le joueur actif a dépassé son délai. */
export async function claimTimeout(db: Firestore, ctx: Ctx, data: unknown): Promise<{ ok: true }> {
  const { gameId } = parseInput(GameInput, data);
  return runLimited(db, ctx, 'game', async (tx) => {
    const gameRef = refs(db).game(gameId);
    const { game, seat } = requireSeat(
      (await tx.get(gameRef)).data() as StoredGame | undefined,
      ctx.uid,
    );
    if (game.status !== 'playing' || !game.state)
      return fail('failed-precondition', 'game-not-active');
    const deadline = game.turnDeadline?.toMillis() ?? Number.POSITIVE_INFINITY;
    if (game.state.current === seat || ctx.now < deadline) {
      return fail('failed-precondition', 'timeout-not-reached', { deadline });
    }
    const pub = forfeit(game.state, game.state.current, 'timeout');
    tx.update(gameRef, {
      ...endGameWrites(db, tx, gameId, game, pub, ctx.now),
      version: game.version + 1,
    });
    return { ok: true };
  });
}

/**
 * Demande de revanche. Quand les deux joueurs l'ont demandée, une nouvelle partie est créée
 * avec les mêmes joueurs (premier joueur tiré au sort) et liée à l'ancienne.
 */
export async function requestRematch(
  db: Firestore,
  ctx: Ctx,
  data: unknown,
): Promise<{ gameId: string | null }> {
  const { gameId } = parseInput(GameInput, data);
  return runLimited(db, ctx, 'createRoom', async (tx) => {
    const gameRef = refs(db).game(gameId);
    const { game } = requireSeat((await tx.get(gameRef)).data() as StoredGame | undefined, ctx.uid);
    if (game.status !== 'finished' && game.status !== 'abandoned') {
      return fail('failed-precondition', 'game-not-over');
    }
    if (game.players.length < 2 || game.startedAt === null) {
      return fail('failed-precondition', 'room-closed');
    }
    if (game.rematch.gameId) return { gameId: game.rematch.gameId };

    const requestedBy = [...new Set([...game.rematch.requestedBy, ctx.uid])];
    const ts = Timestamp.fromMillis(ctx.now);
    if (requestedBy.length < 2) {
      tx.update(gameRef, { 'rematch.requestedBy': requestedBy, updatedAt: ts });
      return { gameId: null };
    }

    // Les deux joueurs doivent être libres (pas de partie en cours ailleurs).
    const userRefs = game.players.map((p) => refs(db).user(p.uid));
    const userSnaps = await tx.getAll(...userRefs);
    const waitingRooms: { id: string; code: string | null }[] = [];
    for (const snap of userSnaps) {
      const currentId = snap.get('currentGameId') as string | null | undefined;
      if (!currentId || currentId === gameId) continue;
      const current = (await tx.get(refs(db).game(currentId))).data() as StoredGame | undefined;
      if (current?.status === 'playing') return fail('failed-precondition', 'opponent-busy');
      if (current?.status === 'waiting' && current.hostUid === snap.id) {
        waitingRooms.push({ id: currentId, code: current.code });
      }
    }

    const newRef = refs(db).games().doc();
    const players = game.players.map((p, i) => seatInfo(userSnaps[i]!, p.uid));
    for (const room of waitingRooms) {
      tx.update(refs(db).game(room.id), {
        status: 'abandoned',
        endedAt: ts,
        updatedAt: ts,
        result: { winner: null, reason: 'expired' },
      });
      if (room.code) tx.delete(refs(db).roomCode(room.code));
    }
    tx.set(newRef, {
      code: null,
      hostUid: game.hostUid,
      createdAt: ts,
      endedAt: null,
      ...startGameWrites(db, tx, newRef.id, players, ctx.now),
    });
    tx.update(gameRef, {
      'rematch.requestedBy': requestedBy,
      'rematch.gameId': newRef.id,
      updatedAt: ts,
    });
    userSnaps.forEach((snap, i) => {
      tx.set(userRefs[i]!, userUpsert(snap, snap.id, ctx.now, { currentGameId: newRef.id }), {
        merge: true,
      });
    });
    return { gameId: newRef.id };
  });
}
