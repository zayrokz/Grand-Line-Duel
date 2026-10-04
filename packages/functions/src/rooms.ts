import { randomInt } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { forfeit, normalizeRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@gld/engine';
import type { GameStatus, Seat } from '@gld/engine';
import { fail } from './errors.js';
import { endGameWrites, seatInfo, startGameWrites, userUpsert } from './games.js';
import type { StoredGame } from './games.js';
import { EmptyInput, GameInput, JoinInput, parseInput } from './input.js';
import { refs } from './paths.js';
import type { Ctx } from './paths.js';
import { runLimited } from './rateLimit.js';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(0, ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Crée un salon en attente. Si l'hôte a déjà un salon en attente, il est renvoyé (idempotent) ;
 * s'il est engagé dans une partie en cours, la création est refusée.
 */
export async function createRoom(
  db: Firestore,
  ctx: Ctx,
  data: unknown,
): Promise<{ gameId: string; code: string }> {
  parseInput(EmptyInput, data);
  return runLimited(db, ctx, 'createRoom', async (tx) => {
    const userRef = refs(db).user(ctx.uid);
    const userSnap = await tx.get(userRef);
    const currentId = userSnap.get('currentGameId') as string | null | undefined;
    if (currentId) {
      const current = (await tx.get(refs(db).game(currentId))).data() as StoredGame | undefined;
      if (current?.status === 'waiting' && current.hostUid === ctx.uid && current.code) {
        return { gameId: currentId, code: current.code };
      }
      if (current?.status === 'playing') {
        fail('failed-precondition', 'already-in-game', { gameId: currentId });
      }
    }

    let code: string | null = null;
    for (let attempt = 0; attempt < 5 && code === null; attempt++) {
      const candidate = randomCode();
      if (!(await tx.get(refs(db).roomCode(candidate))).exists) code = candidate;
    }
    if (code === null) throw new Error('Impossible de générer un code de salon unique');

    const gameRef = refs(db).games().doc();
    const ts = Timestamp.fromMillis(ctx.now);
    const game: StoredGame = {
      code,
      status: 'waiting',
      hostUid: ctx.uid,
      players: [seatInfo(userSnap, ctx.uid)],
      playerUids: [ctx.uid],
      createdAt: ts,
      updatedAt: ts,
      startedAt: null,
      endedAt: null,
      version: 0,
      state: null,
      turnDeadline: null,
      lastMove: null,
      result: null,
      rematch: { requestedBy: [], gameId: null },
    };
    tx.set(gameRef, game);
    tx.set(refs(db).roomCode(code), { gameId: gameRef.id, createdAt: ts });
    tx.set(userRef, userUpsert(userSnap, ctx.uid, ctx.now, { currentGameId: gameRef.id }), {
      merge: true,
    });
    return { gameId: gameRef.id, code };
  });
}

/**
 * Rejoint un salon par son code et démarre la partie. Un joueur déjà présent est simplement
 * renvoyé vers la partie (lien d'invitation cliqué deux fois, rechargement…).
 */
export async function joinRoom(
  db: Firestore,
  ctx: Ctx,
  data: unknown,
): Promise<{ gameId: string }> {
  const input = parseInput(JoinInput, data);
  const code = normalizeRoomCode(input.code) ?? fail('invalid-argument', 'invalid-code');
  return runLimited(db, ctx, 'joinRoom', async (tx) => {
    const codeSnap = await tx.get(refs(db).roomCode(code));
    const gameId = codeSnap.get('gameId') as string | undefined;
    if (!gameId) return fail('not-found', 'room-not-found');
    const gameRef = refs(db).game(gameId);
    const game = (await tx.get(gameRef)).data() as StoredGame | undefined;
    if (!game) return fail('not-found', 'room-not-found');
    if (game.playerUids.includes(ctx.uid)) return { gameId };
    if (game.status !== 'waiting' || game.playerUids.length >= 2) {
      return fail('failed-precondition', game.status === 'playing' ? 'room-full' : 'room-closed');
    }

    const userRef = refs(db).user(ctx.uid);
    const userSnap = await tx.get(userRef);
    const currentId = userSnap.get('currentGameId') as string | null | undefined;
    let ownWaitingRoom: { id: string; code: string | null } | null = null;
    if (currentId && currentId !== gameId) {
      const current = (await tx.get(refs(db).game(currentId))).data() as StoredGame | undefined;
      if (current?.status === 'playing') {
        fail('failed-precondition', 'already-in-game', { gameId: currentId });
      }
      if (current?.status === 'waiting' && current.hostUid === ctx.uid) {
        ownWaitingRoom = { id: currentId, code: current.code };
      }
    }

    // Écritures (toutes les lectures sont faites).
    const ts = Timestamp.fromMillis(ctx.now);
    if (ownWaitingRoom) {
      tx.update(refs(db).game(ownWaitingRoom.id), {
        status: 'abandoned' satisfies GameStatus,
        endedAt: ts,
        updatedAt: ts,
        result: { winner: null, reason: 'expired' },
      });
      if (ownWaitingRoom.code) tx.delete(refs(db).roomCode(ownWaitingRoom.code));
    }
    const players = [...game.players, seatInfo(userSnap, ctx.uid)];
    tx.update(gameRef, startGameWrites(db, tx, gameId, players, ctx.now));
    tx.set(userRef, userUpsert(userSnap, ctx.uid, ctx.now, { currentGameId: gameId }), {
      merge: true,
    });
    return { gameId };
  });
}

/**
 * Quitte un salon : annule un salon en attente (hôte), abandonne une partie en cours (défaite),
 * sans effet sur une partie terminée.
 */
export async function leaveGame(
  db: Firestore,
  ctx: Ctx,
  data: unknown,
): Promise<{ status: GameStatus }> {
  const { gameId } = parseInput(GameInput, data);
  return runLimited(db, ctx, 'game', async (tx) => {
    const gameRef = refs(db).game(gameId);
    const game = (await tx.get(gameRef)).data() as StoredGame | undefined;
    if (!game) return fail('not-found', 'room-not-found');
    const seat = game.playerUids.indexOf(ctx.uid);
    if (seat === -1) return fail('permission-denied', 'not-a-player');
    const ts = Timestamp.fromMillis(ctx.now);

    if (game.status === 'waiting') {
      tx.update(gameRef, {
        status: 'abandoned' satisfies GameStatus,
        endedAt: ts,
        updatedAt: ts,
        result: { winner: null, reason: 'expired' },
      });
      if (game.code) tx.delete(refs(db).roomCode(game.code));
      tx.set(refs(db).user(ctx.uid), { currentGameId: null, updatedAt: ts }, { merge: true });
      return { status: 'abandoned' };
    }
    if (game.status === 'playing' && game.state) {
      const pub = forfeit(game.state, seat as Seat, 'resign');
      tx.update(gameRef, {
        ...endGameWrites(db, tx, gameId, game, pub, ctx.now),
        version: game.version + 1,
      });
      return { status: 'abandoned' };
    }
    return { status: game.status };
  });
}
