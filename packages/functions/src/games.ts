import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { DocumentSnapshot, Firestore, Transaction } from 'firebase-admin/firestore';
import { AVATAR_IDS, createGame, summarize, TURN_TIMEOUT_MS } from '@gld/engine';
import type {
  GameDoc,
  GameState,
  HistoryDoc,
  PublicState,
  SeatInfo,
  UserDoc,
  WinReason,
} from '@gld/engine';
import { refs } from './paths.js';

export type StoredGame = GameDoc<Timestamp>;
export type StoredUser = UserDoc<Timestamp>;

/** Profil par défaut d'un nouveau joueur (pseudo dérivé de l'uid, sans donnée personnelle). */
export function defaultProfile(uid: string): { nickname: string; avatar: string } {
  const suffix =
    uid
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'X';
  return { nickname: `Pirate-${suffix}`, avatar: AVATAR_IDS[0] };
}

/**
 * Champs à fusionner dans `users/{uid}` : crée le profil s'il n'existe pas encore,
 * puis applique `fields`.
 */
export function userUpsert(
  snap: DocumentSnapshot,
  uid: string,
  now: number,
  fields: Partial<StoredUser>,
): Partial<StoredUser> {
  const ts = Timestamp.fromMillis(now);
  if (snap.exists) return { ...fields, updatedAt: ts };
  return {
    ...defaultProfile(uid),
    stats: { played: 0, wins: 0, losses: 0, abandons: 0 },
    currentGameId: null,
    createdAt: ts,
    ...fields,
    updatedAt: ts,
  };
}

export function seatInfo(snap: DocumentSnapshot, uid: string): SeatInfo {
  const fallback = defaultProfile(uid);
  return {
    uid,
    nickname: (snap.get('nickname') as string | undefined) ?? fallback.nickname,
    avatar: (snap.get('avatar') as string | undefined) ?? fallback.avatar,
  };
}

/** Graine de 256 bits tirée par le serveur (jamais exposée au client). */
export const newSeed = (): string => randomBytes(32).toString('hex');

/**
 * Démarre une partie : état public dans `games/{id}`, réserves vides dans les documents privés,
 * paquets/sac/graine dans `gameSecrets/{id}`. Renvoie les champs de jeu à écrire dans le salon.
 */
export function startGameWrites(
  db: Firestore,
  tx: Transaction,
  gameId: string,
  players: SeatInfo[],
  now: number,
  seed: string = newSeed(),
): Partial<StoredGame> {
  const state = createGame(seed);
  for (const player of players) tx.set(refs(db).private(gameId, player.uid), { reserved: [] });
  tx.set(refs(db).secret(gameId), { sec: state.sec, createdAt: Timestamp.fromMillis(now) });
  return {
    status: 'playing',
    players,
    playerUids: players.map((p) => p.uid),
    startedAt: Timestamp.fromMillis(now),
    updatedAt: Timestamp.fromMillis(now),
    version: 1,
    state: state.pub,
    turnDeadline: Timestamp.fromMillis(now + TURN_TIMEOUT_MS),
    lastMove: null,
    result: null,
    rematch: { requestedBy: [], gameId: null },
  };
}

/** Écrit l'état secret et les réserves privées qui ont changé. */
export function secretWrites(
  db: Firestore,
  tx: Transaction,
  gameId: string,
  game: StoredGame,
  before: GameState,
  after: GameState,
): void {
  tx.update(refs(db).secret(gameId), { sec: after.sec });
  for (const seat of [0, 1] as const) {
    const changed =
      JSON.stringify(before.sec.reserved[seat]) !== JSON.stringify(after.sec.reserved[seat]);
    const uid = game.players[seat]?.uid;
    if (changed && uid)
      tx.set(refs(db).private(gameId, uid), { reserved: after.sec.reserved[seat] });
  }
}

/**
 * Clôture d'une partie : statistiques et historique des deux joueurs, libération du code de salon.
 * Renvoie les champs à fusionner dans le document de partie (une seule écriture par document).
 */
export function endGameWrites(
  db: Firestore,
  tx: Transaction,
  gameId: string,
  game: StoredGame,
  pub: PublicState,
  now: number,
): Partial<StoredGame> {
  const ts = Timestamp.fromMillis(now);
  const reason = pub.winReason as WinReason;
  const forfeited = reason === 'resign' || reason === 'timeout';
  const status = forfeited ? 'abandoned' : 'finished';

  game.players.forEach((player, index) => {
    const seat = index as 0 | 1;
    const opponent = game.players[seat === 0 ? 1 : 0];
    if (!opponent) return;
    const won = pub.winner === seat;
    tx.set(
      refs(db).user(player.uid),
      {
        stats: {
          played: FieldValue.increment(1),
          wins: FieldValue.increment(won ? 1 : 0),
          losses: FieldValue.increment(won ? 0 : 1),
          abandons: FieldValue.increment(!won && forfeited ? 1 : 0),
        },
        currentGameId: null,
        updatedAt: ts,
      },
      { merge: true },
    );
    const history: HistoryDoc<Timestamp> = {
      gameId,
      endedAt: ts,
      opponent: { nickname: opponent.nickname, avatar: opponent.avatar },
      result: won ? 'win' : 'loss',
      reason,
      myPoints: summarize(pub.players[seat]).points,
      opponentPoints: summarize(pub.players[seat === 0 ? 1 : 0]).points,
      turns: pub.turn,
    };
    tx.set(refs(db).history(player.uid, gameId), history);
  });
  if (game.code) tx.delete(refs(db).roomCode(game.code));

  return {
    status,
    state: pub,
    endedAt: ts,
    updatedAt: ts,
    turnDeadline: null,
    result: { winner: pub.winner, reason },
  };
}
