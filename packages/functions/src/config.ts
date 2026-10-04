import { FUNCTIONS_REGION } from '@gld/engine';

export { TURN_TIMEOUT_MS } from '@gld/engine';

/** Région des Functions (joueurs francophones), partagée avec le client web. */
export const REGION = FUNCTIONS_REGION;

/** Un salon en attente expire au bout de 6 h. */
export const WAITING_ROOM_TTL_MS = 6 * 60 * 60 * 1000;

/** Une partie dont le délai de tour est dépassé depuis 24 h est close par le nettoyage. */
export const STALE_GAME_MS = 24 * 60 * 60 * 1000;

export interface RateLimit {
  max: number;
  windowMs: number;
}

/** Limites par utilisateur (fenêtre fixe). Larges pour un humain, bloquantes pour un script. */
export const RATE_LIMITS = {
  createRoom: { max: 10, windowMs: 60 * 60 * 1000 },
  joinRoom: { max: 30, windowMs: 10 * 60 * 1000 },
  move: { max: 120, windowMs: 60 * 1000 },
  profile: { max: 20, windowMs: 10 * 60 * 1000 },
  game: { max: 30, windowMs: 60 * 1000 },
} satisfies Record<string, RateLimit>;

export type RateLimitKey = keyof typeof RATE_LIMITS;
