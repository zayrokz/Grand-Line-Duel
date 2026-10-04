/**
 * Contrat partagé entre le client et les Cloud Functions : documents Firestore, entrées/sorties des
 * callables, codes d'erreur et validation des saisies. Aucune dépendance à Firebase : les dates
 * sont typées par `TimestampLike` (compatible avec les Timestamp client et Admin).
 */
import type { PublicState, Seat, WinReason } from './types.js';

export interface TimestampLike {
  toMillis(): number;
}

export type GameStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';

export interface SeatInfo {
  uid: string;
  nickname: string;
  avatar: string;
}

export interface GameDoc<T = TimestampLike> {
  code: string | null;
  status: GameStatus;
  hostUid: string;
  players: SeatInfo[];
  playerUids: string[];
  createdAt: T;
  updatedAt: T;
  startedAt: T | null;
  endedAt: T | null;
  version: number;
  state: PublicState | null;
  turnDeadline: T | null;
  lastMove: { id: string; seat: Seat; version: number } | null;
  result: { winner: Seat | null; reason: WinReason | 'expired' } | null;
  rematch: { requestedBy: string[]; gameId: string | null };
}

export interface PrivateDoc {
  reserved: string[];
}

export interface UserStats {
  played: number;
  wins: number;
  losses: number;
  abandons: number;
}

export interface UserDoc<T = TimestampLike> {
  nickname: string;
  avatar: string;
  stats: UserStats;
  currentGameId: string | null;
  createdAt: T;
  updatedAt: T;
}

export interface HistoryDoc<T = TimestampLike> {
  gameId: string;
  endedAt: T;
  opponent: { nickname: string; avatar: string };
  result: 'win' | 'loss';
  reason: WinReason;
  myPoints: number;
  opponentPoints: number;
  turns: number;
}

/** Codes d'erreur stables renvoyés dans `HttpsError.details.reason`. */
export type ApiErrorReason =
  | 'invalid-input'
  | 'invalid-nickname'
  | 'invalid-avatar'
  | 'invalid-code'
  | 'rate-limited'
  | 'room-not-found'
  | 'room-full'
  | 'room-closed'
  | 'already-in-game'
  | 'opponent-busy'
  | 'not-a-player'
  | 'game-not-active'
  | 'stale-version'
  | 'not-your-turn'
  | 'illegal-move'
  | 'timeout-not-reached'
  | 'game-not-over';

export interface SubmitMoveRequest {
  gameId: string;
  move: unknown;
  expectedVersion: number;
  moveId: string;
}

/* ---------- Validation des saisies (partagée client / serveur) ---------- */

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;

/**
 * Normalise et valide un pseudo : NFKC, suppression des caractères de contrôle et invisibles,
 * espaces fusionnés, 2 à 20 caractères, lettres/chiffres et `espace _ ' . -` uniquement.
 */
export function normalizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 200) return null;
  const cleaned = raw.normalize('NFKC').replace(/\p{C}/gu, '').replace(/\s+/gu, ' ').trim();
  const length = [...cleaned].length;
  if (length < NICKNAME_MIN || length > NICKNAME_MAX) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N}\p{M} _'.-]*$/u.test(cleaned)) return null;
  return cleaned;
}

/** Identifiants d'avatars autorisés (le visuel est défini dans le thème du client). */
export const AVATAR_IDS = [
  'parrot',
  'octopus',
  'shark',
  'anchor',
  'compass',
  'skull',
  'crab',
  'whale',
  'ship',
  'map',
  'sword',
  'turtle',
] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}

/** Alphabet des codes de salon : sans caractères ambigus (0/O, 1/I/L). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

export function normalizeRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 20) return null;
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  const pattern = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
  return pattern.test(code) ? code : null;
}

/** Identifiant de document Firestore généré automatiquement (20 caractères alphanumériques). */
export function isGameId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9]{20}$/.test(value);
}

/** Identifiant de coup choisi par le client pour l'idempotence. */
export function isMoveId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

/** Délai accordé au joueur actif avant que l'adversaire puisse réclamer la victoire. */
export const TURN_TIMEOUT_MS = 5 * 60 * 1000;

/** Région des Cloud Functions, partagée par le serveur et le client. */
export const FUNCTIONS_REGION = 'europe-west1';
