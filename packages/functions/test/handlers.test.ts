import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore, Timestamp } from 'firebase-admin/firestore';
import { CARDS, getLegalMoves, LEVELS, toPlayerView, TURN_TIMEOUT_MS } from '@gld/engine';
import type { GameDoc, GameState, Move, PublicState, SecretState, Seat } from '@gld/engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanupGames } from '../src/cleanup.js';
import { STALE_GAME_MS, WAITING_ROOM_TTL_MS } from '../src/config.js';
import { ApiError } from '../src/errors.js';
import { claimTimeout, requestRematch, submitMove } from '../src/play.js';
import { saveProfile } from '../src/profile.js';
import { createRoom, joinRoom, leaveGame } from '../src/rooms.js';

const PROJECT_ID = 'demo-grand-line-duel';
let db: Firestore;
let clock = Date.UTC(2026, 0, 1);
const ctx = (uid: string, now = clock) => ({ uid, now });

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST absent : lancez `npm run test:emulator` à la racine.');
  }
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
  db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
});

beforeEach(async () => {
  clock += 60 * 60 * 1000;
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: 'DELETE',
  });
});

afterAll(async () => {
  await db.terminate();
});

async function expectReason(promise: Promise<unknown>, reason: string): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).reason).toBe(reason);
  return error as ApiError;
}

const gameDoc = async (id: string) =>
  (await db.collection('games').doc(id).get()).data() as GameDoc<Timestamp>;
const secretDoc = async (id: string) =>
  (await db.collection('gameSecrets').doc(id).get()).get('sec') as SecretState;
const userDoc = async (uid: string) => (await db.collection('users').doc(uid).get()).data();

/** Crée un salon (alice) rejoint par bob ; renvoie l'identifiant et les sièges. */
async function startedGame() {
  await saveProfile(db, ctx('alice'), { nickname: 'Alice', avatar: 'parrot' });
  await saveProfile(db, ctx('bob'), { nickname: 'Bob', avatar: 'shark' });
  const { gameId, code } = await createRoom(db, ctx('alice'), {});
  await joinRoom(db, ctx('bob'), { code });
  const game = await gameDoc(gameId);
  const current = game.state!.current;
  const active = game.players[current]!.uid;
  const waiting = game.players[current === 0 ? 1 : 0]!.uid;
  return { gameId, code, game, active, waiting, current };
}

async function fullState(gameId: string): Promise<GameState> {
  return { pub: (await gameDoc(gameId)).state as PublicState, sec: await secretDoc(gameId) };
}

let moveCounter = 0;
const moveId = () => `move-${++moveCounter}-${Date.now()}`;

describe('profil', () => {
  it('crée le profil avec un pseudo assaini', async () => {
    const result = await saveProfile(db, ctx('alice'), {
      nickname: '  Barbe   Rousse ',
      avatar: 'crab',
    });
    expect(result).toEqual({ nickname: 'Barbe Rousse', avatar: 'crab' });
    const user = await userDoc('alice');
    expect(user).toMatchObject({
      nickname: 'Barbe Rousse',
      avatar: 'crab',
      stats: { played: 0, wins: 0, losses: 0, abandons: 0 },
      currentGameId: null,
    });
  });

  it('refuse un pseudo, un avatar ou des champs invalides', async () => {
    await expectReason(
      saveProfile(db, ctx('a'), { nickname: '<b>x</b>', avatar: 'crab' }),
      'invalid-nickname',
    );
    await expectReason(
      saveProfile(db, ctx('a'), { nickname: 'Ok', avatar: '__proto__' }),
      'invalid-avatar',
    );
    await expectReason(
      saveProfile(db, ctx('a'), { nickname: 'Ok', avatar: 'crab', stats: { wins: 9 } }),
      'invalid-input',
    );
  });
});

describe('salons', () => {
  it('crée un salon en attente avec un code court, de façon idempotente', async () => {
    const first = await createRoom(db, ctx('alice'), {});
    expect(first.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const game = await gameDoc(first.gameId);
    expect(game).toMatchObject({ status: 'waiting', playerUids: ['alice'], state: null });
    expect((await db.collection('roomCodes').doc(first.code).get()).get('gameId')).toBe(
      first.gameId,
    );
    expect(await createRoom(db, ctx('alice'), {})).toEqual(first);
    expect((await userDoc('alice'))?.currentGameId).toBe(first.gameId);
  });

  it('démarre la partie quand le second joueur rejoint, sans exposer de secret', async () => {
    const { gameId, game } = await startedGame();
    expect(game.status).toBe('playing');
    expect(game.playerUids).toEqual(['alice', 'bob']);
    expect(game.players.map((p) => p.nickname)).toEqual(['Alice', 'Bob']);
    expect(game.version).toBe(1);
    expect(game.turnDeadline).not.toBeNull();
    const sec = await secretDoc(gameId);
    const publicJson = JSON.stringify(game);
    for (const level of LEVELS) {
      expect(sec.decks[level].length).toBeGreaterThan(0);
      for (const id of sec.decks[level]) expect(publicJson).not.toContain(`"${id}"`);
    }
    expect(publicJson).not.toContain('"rng"');
    const priv = await db.collection('games').doc(gameId).collection('private').doc('bob').get();
    expect(priv.data()).toEqual({ reserved: [] });
  });

  it('refuse un troisième joueur et laisse un joueur présent revenir', async () => {
    const { gameId, code } = await startedGame();
    await expectReason(joinRoom(db, ctx('carol'), { code }), 'room-full');
    expect(await joinRoom(db, ctx('bob'), { code })).toEqual({ gameId });
    expect(await joinRoom(db, ctx('alice'), { code: code.toLowerCase() })).toEqual({ gameId });
  });

  it('valide le code de salon', async () => {
    await expectReason(joinRoom(db, ctx('bob'), { code: 'xx' }), 'invalid-code');
    await expectReason(joinRoom(db, ctx('bob'), { code: 'ZZZZZZ' }), 'room-not-found');
    await expectReason(joinRoom(db, ctx('bob'), { code: 'ZZZZZZ', admin: true }), 'invalid-input');
  });

  it('empêche de créer ou rejoindre un salon pendant une partie en cours', async () => {
    const { gameId } = await startedGame();
    const error = await expectReason(createRoom(db, ctx('alice'), {}), 'already-in-game');
    expect(error.extra).toEqual({ gameId });
    const other = await createRoom(db, ctx('carol'), {});
    await expectReason(joinRoom(db, ctx('bob'), { code: other.code }), 'already-in-game');
  });

  it('annule son propre salon en attente en rejoignant celui d’un autre', async () => {
    const mine = await createRoom(db, ctx('alice'), {});
    const theirs = await createRoom(db, ctx('bob'), {});
    await joinRoom(db, ctx('alice'), { code: theirs.code });
    expect((await gameDoc(mine.gameId)).status).toBe('abandoned');
    expect((await db.collection('roomCodes').doc(mine.code).get()).exists).toBe(false);
  });

  it('annule un salon en attente quand l’hôte le quitte', async () => {
    const { gameId, code } = await createRoom(db, ctx('alice'), {});
    expect(await leaveGame(db, ctx('alice'), { gameId })).toEqual({ status: 'abandoned' });
    expect((await gameDoc(gameId)).status).toBe('abandoned');
    await expectReason(joinRoom(db, ctx('bob'), { code }), 'room-not-found');
    expect((await userDoc('alice'))?.currentGameId).toBeNull();
  });
});

describe('coups', () => {
  it('applique un coup légal et incrémente la version', async () => {
    const { gameId, active } = await startedGame();
    const state = await fullState(gameId);
    const seat = state.pub.current;
    const move = getLegalMoves(toPlayerView(state, seat)).find((m) => m.type === 'takeTokens')!;
    expect(
      await submitMove(db, ctx(active), { gameId, move, expectedVersion: 1, moveId: moveId() }),
    ).toEqual({
      version: 2,
    });
    const after = await gameDoc(gameId);
    expect(after.version).toBe(2);
    expect(after.state!.current).toBe(seat === 0 ? 1 : 0);
    expect(after.lastMove).toMatchObject({ seat, version: 2 });
  });

  it('refuse un non-joueur, le mauvais tour, une version périmée et un coup illégal', async () => {
    const { gameId, active, waiting } = await startedGame();
    const take: Move = { type: 'takeTokens', cells: [12] };
    const goldCell = (await gameDoc(gameId)).state!.board.indexOf('gold');
    await expectReason(
      submitMove(db, ctx('mallory'), { gameId, move: take, expectedVersion: 1, moveId: moveId() }),
      'not-a-player',
    );
    await expectReason(
      submitMove(db, ctx(waiting), { gameId, move: take, expectedVersion: 1, moveId: moveId() }),
      'not-your-turn',
    );
    await expectReason(
      submitMove(db, ctx(active), { gameId, move: take, expectedVersion: 0, moveId: moveId() }),
      'stale-version',
    );
    const illegal = await expectReason(
      submitMove(db, ctx(active), {
        gameId,
        move: { type: 'takeTokens', cells: [goldCell] },
        expectedVersion: 1,
        moveId: moveId(),
      }),
      'illegal-move',
    );
    expect(illegal.extra).toEqual({ rule: 'gold-forbidden' });
    await expectReason(
      submitMove(db, ctx(active), {
        gameId,
        move: { type: 'cheat' },
        expectedVersion: 1,
        moveId: moveId(),
      }),
      'invalid-input',
    );
    expect((await gameDoc(gameId)).version).toBe(1);
  });

  it('est idempotent : un même moveId rejoué n’est appliqué qu’une fois', async () => {
    const { gameId, active } = await startedGame();
    const state = await fullState(gameId);
    const move = getLegalMoves(toPlayerView(state, state.pub.current)).find(
      (m) => m.type === 'takeTokens',
    )!;
    const id = moveId();
    const payload = { gameId, move, expectedVersion: 1, moveId: id };
    const results = await Promise.all([
      submitMove(db, ctx(active), payload),
      submitMove(db, ctx(active), payload),
    ]);
    expect(results).toEqual([{ version: 2 }, { version: 2 }]);
    expect((await gameDoc(gameId)).version).toBe(2);
    expect(await submitMove(db, ctx(active), payload)).toEqual({ version: 2 });
  });

  it('ne publie une carte réservée que dans le document privé de son propriétaire', async () => {
    const { gameId, active, waiting } = await startedGame();
    const goldCell = (await gameDoc(gameId)).state!.board.indexOf('gold');
    await submitMove(db, ctx(active), {
      gameId,
      move: { type: 'reserveDeck', goldCell, level: 3 },
      expectedVersion: 1,
      moveId: moveId(),
    });
    const sec = await secretDoc(gameId);
    const game = await gameDoc(gameId);
    const seat = game.playerUids.indexOf(active) as Seat;
    const reserved = sec.reserved[seat][0]!;
    expect(JSON.stringify(game)).not.toContain(`"${reserved}"`);
    expect(game.state!.players[seat].reservedLevels).toEqual([3]);
    const mine = await db.doc(`games/${gameId}/private/${active}`).get();
    const theirs = await db.doc(`games/${gameId}/private/${waiting}`).get();
    expect(mine.get('reserved')).toEqual([reserved]);
    expect(theirs.get('reserved')).toEqual([]);
  });

  it('clôt la partie à la victoire : statistiques, historique, code libéré', async () => {
    const { gameId, code, active, waiting } = await startedGame();
    // Prépare une victoire : le joueur actif possède déjà 20 Renommée.
    const game = await gameDoc(gameId);
    const seat = game.state!.current;
    const winners = CARDS.filter((c) => c.level === 3 && c.bonus !== null && c.bonus !== 'joker');
    const pub = structuredClone(game.state!);
    pub.players[seat].cards = [
      winners.find((c) => c.bonus === 'white' && c.points === 5)!,
      winners.find((c) => c.bonus === 'green' && c.points === 5)!,
      winners.find((c) => c.bonus === 'black' && c.points === 5)!,
      winners.find((c) => c.bonus === 'blue' && c.crowns === 2)!,
    ].map((c) => ({ id: c.id, color: c.bonus as 'white' }));
    pub.players[seat].royals = ['E1'];
    const sec = await secretDoc(gameId);
    for (const level of LEVELS) {
      const owned = new Set(pub.players[seat].cards.map((c) => c.id));
      sec.decks[level] = sec.decks[level].filter((id) => !owned.has(id));
      pub.pyramid[level] = pub.pyramid[level].map((id) => (id && owned.has(id) ? null : id));
      pub.deckCounts[level] = sec.decks[level].length;
    }
    await db.doc(`games/${gameId}`).update({ state: pub });
    await db.doc(`gameSecrets/${gameId}`).update({ sec });

    const move = getLegalMoves(toPlayerView({ pub, sec }, seat)).find(
      (m) => m.type === 'takeTokens',
    )!;
    await submitMove(db, ctx(active), { gameId, move, expectedVersion: 1, moveId: moveId() });

    const ended = await gameDoc(gameId);
    expect(ended.status).toBe('finished');
    expect(ended.result).toEqual({ winner: seat, reason: 'points' });
    expect(ended.endedAt).not.toBeNull();
    expect(ended.turnDeadline).toBeNull();
    expect((await userDoc(active))?.stats).toEqual({ played: 1, wins: 1, losses: 0, abandons: 0 });
    expect((await userDoc(waiting))?.stats).toEqual({ played: 1, wins: 0, losses: 1, abandons: 0 });
    expect((await userDoc(active))?.currentGameId).toBeNull();
    const history = (await db.doc(`users/${active}/history/${gameId}`).get()).data();
    expect(history).toMatchObject({ result: 'win', reason: 'points', myPoints: 22 });
    expect((await db.collection('roomCodes').doc(code).get()).exists).toBe(false);
    await expectReason(
      submitMove(db, ctx(waiting), { gameId, move, expectedVersion: 2, moveId: moveId() }),
      'game-not-active',
    );
  });
});

describe('abandon, délai et revanche', () => {
  it('abandonner une partie en cours donne la victoire à l’adversaire', async () => {
    const { gameId, active, waiting } = await startedGame();
    await leaveGame(db, ctx(waiting), { gameId });
    const game = await gameDoc(gameId);
    expect(game.status).toBe('abandoned');
    expect(game.result?.reason).toBe('resign');
    expect(game.players[game.result!.winner!]!.uid).toBe(active);
    expect((await userDoc(waiting))?.stats).toMatchObject({ losses: 1, abandons: 1 });
  });

  it('réclamer la victoire n’est possible qu’après le délai et par l’adversaire', async () => {
    const { gameId, active, waiting } = await startedGame();
    await expectReason(claimTimeout(db, ctx(waiting), { gameId }), 'timeout-not-reached');
    const later = clock + TURN_TIMEOUT_MS + 1000;
    await expectReason(claimTimeout(db, ctx(active, later), { gameId }), 'timeout-not-reached');
    await expectReason(claimTimeout(db, ctx('mallory', later), { gameId }), 'not-a-player');
    await claimTimeout(db, ctx(waiting, later), { gameId });
    const game = await gameDoc(gameId);
    expect(game.status).toBe('abandoned');
    expect(game.result?.reason).toBe('timeout');
    expect(game.players[game.result!.winner!]!.uid).toBe(waiting);
  });

  it('crée une revanche quand les deux joueurs la demandent', async () => {
    const { gameId, waiting, active } = await startedGame();
    await expectReason(requestRematch(db, ctx(active), { gameId }), 'game-not-over');
    await leaveGame(db, ctx(waiting), { gameId });
    expect(await requestRematch(db, ctx(active), { gameId })).toEqual({ gameId: null });
    expect(await requestRematch(db, ctx(active), { gameId })).toEqual({ gameId: null });
    const { gameId: rematchId } = await requestRematch(db, ctx(waiting), { gameId });
    expect(rematchId).toBeTruthy();
    expect(await requestRematch(db, ctx(active), { gameId })).toEqual({ gameId: rematchId });
    const rematch = await gameDoc(rematchId!);
    expect(rematch.status).toBe('playing');
    expect([...rematch.playerUids].sort()).toEqual(['alice', 'bob']);
    expect((await userDoc('alice'))?.currentGameId).toBe(rematchId);
    expect((await gameDoc(gameId)).rematch.gameId).toBe(rematchId);
  });
});

describe('limitation de débit', () => {
  it('bloque les tentatives répétées de codes de salon, y compris les échecs', async () => {
    for (let i = 0; i < 30; i++) {
      await expectReason(joinRoom(db, ctx('mallory'), { code: 'ZZZZZZ' }), 'room-not-found');
    }
    await expectReason(joinRoom(db, ctx('mallory'), { code: 'ZZZZZZ' }), 'rate-limited');
    // La fenêtre est par utilisateur et se réinitialise.
    await expectReason(joinRoom(db, ctx('carol'), { code: 'ZZZZZZ' }), 'room-not-found');
    await expectReason(
      joinRoom(db, ctx('mallory', clock + 11 * 60 * 1000), { code: 'ZZZZZZ' }),
      'room-not-found',
    );
  });
});

describe('nettoyage planifié', () => {
  it('expire les salons en attente et clôt les parties abandonnées', async () => {
    const waitingRoom = await createRoom(db, ctx('carol'), {});
    const { gameId, active } = await startedGame();
    const result = await cleanupGames(
      db,
      clock + WAITING_ROOM_TTL_MS + STALE_GAME_MS + TURN_TIMEOUT_MS + 1,
    );
    expect(result).toEqual({ expired: 1, closed: 1 });
    expect((await gameDoc(waitingRoom.gameId)).status).toBe('abandoned');
    expect((await userDoc('carol'))?.currentGameId).toBeNull();
    const game = await gameDoc(gameId);
    expect(game.status).toBe('abandoned');
    expect(game.result?.reason).toBe('timeout');
    expect(game.players[game.result!.winner!]!.uid).not.toBe(active);
  });

  it('ne touche pas aux salons et parties récents', async () => {
    await createRoom(db, ctx('carol'), {});
    await startedGame();
    expect(await cleanupGames(db, clock + 60 * 1000)).toEqual({ expired: 0, closed: 0 });
  });
});

describe('hasard', () => {
  it('tire une graine secrète de 256 bits par partie', async () => {
    const { gameId } = await startedGame();
    const sec = await secretDoc(gameId);
    expect(sec.rng.seed).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(await gameDoc(gameId))).not.toContain(sec.rng.seed);
  });
});
