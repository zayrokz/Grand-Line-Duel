import { httpsCallable } from 'firebase/functions';
import type { FunctionsError } from 'firebase/functions';
import type { ApiErrorReason, GameStatus, IllegalReason, Move } from '@gld/engine';
import { functions } from './firebase';
import { ERROR_MESSAGES, ILLEGAL_MESSAGES } from './text';

function callable<I, O>(name: string) {
  const fn = httpsCallable<I, O>(functions, name, { timeout: 20_000 });
  return async (data: I): Promise<O> => (await fn(data)).data;
}

/** Callables du serveur (les seules opérations d'écriture du client). */
export const api = {
  saveProfile: callable<{ nickname: string; avatar: string }, { nickname: string; avatar: string }>(
    'saveProfile',
  ),
  createRoom: callable<Record<string, never>, { gameId: string; code: string }>('createRoom'),
  joinRoom: callable<{ code: string }, { gameId: string }>('joinRoom'),
  leaveGame: callable<{ gameId: string }, { status: GameStatus }>('leaveGame'),
  submitMove: callable<
    { gameId: string; move: Move; expectedVersion: number; moveId: string },
    { version: number }
  >('submitMove'),
  claimTimeout: callable<{ gameId: string }, { ok: true }>('claimTimeout'),
  requestRematch: callable<{ gameId: string }, { gameId: string | null }>('requestRematch'),
};

interface ErrorDetails {
  reason?: ApiErrorReason;
  rule?: IllegalReason;
  gameId?: string;
}

export function errorDetails(error: unknown): ErrorDetails {
  const details = (error as FunctionsError | undefined)?.details;
  return details && typeof details === 'object' ? (details as ErrorDetails) : {};
}

export function errorCode(error: unknown): string {
  return String((error as FunctionsError | undefined)?.code ?? 'unknown').replace('functions/', '');
}

/** Message d'erreur en français pour l'utilisateur. */
export function errorMessage(error: unknown): string {
  const { reason, rule } = errorDetails(error);
  if (reason === 'illegal-move' && rule) return ILLEGAL_MESSAGES[rule] ?? ERROR_MESSAGES[reason];
  if (reason && ERROR_MESSAGES[reason]) return ERROR_MESSAGES[reason];
  switch (errorCode(error)) {
    case 'unauthenticated':
      return 'Connexion requise. Recharge la page.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Le serveur ne répond pas. Vérifie ta connexion.';
    case 'permission-denied':
      return 'Accès refusé.';
    default:
      return 'Une erreur inattendue est survenue.';
  }
}

/** Erreur réseau transitoire : on peut réessayer le même coup (idempotent). */
export function isTransient(error: unknown): boolean {
  return ['unavailable', 'deadline-exceeded', 'internal'].includes(errorCode(error));
}
