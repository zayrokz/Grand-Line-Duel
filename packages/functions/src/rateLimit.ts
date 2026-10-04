import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { RATE_LIMITS } from './config.js';
import { ApiError } from './errors.js';
import type { RateLimitKey } from './config.js';
import { refs } from './paths.js';

interface Window {
  count: number;
  start: number;
}

export interface RateLimitCheck {
  allowed: boolean;
  /** Enregistre la consommation (à appeler dans la phase d'écriture de la transaction). */
  commit(): void;
}

/**
 * Limitation de débit transactionnelle à fenêtre fixe, stockée dans `rateLimits/{uid}`
 * (illisible par les clients). La lecture se fait avant toute écriture de la transaction.
 */
export async function checkRateLimit(
  db: Firestore,
  tx: Transaction,
  uid: string,
  key: RateLimitKey,
  now: number,
): Promise<RateLimitCheck> {
  const { max, windowMs } = RATE_LIMITS[key];
  const ref = refs(db).rateLimit(uid);
  const snap = await tx.get(ref);
  const current = (snap.get(key) as Window | undefined) ?? { count: 0, start: now };
  const window = now - current.start >= windowMs ? { count: 0, start: now } : current;
  const allowed = window.count < max;
  return {
    allowed,
    commit: () => {
      if (!allowed) return;
      tx.set(ref, { [key]: { count: window.count + 1, start: window.start } }, { merge: true });
    },
  };
}

/**
 * Exécute `body` dans une transaction soumise à la limite `key`. Les refus métier (ApiError)
 * consomment quand même le quota — sinon un script pourrait marteler des coups illégaux ou
 * deviner des codes de salon sans être limité. Convention : `body` fait toutes ses vérifications
 * avant sa première écriture, de sorte qu'un refus n'écrit rien d'autre que le compteur.
 */
export async function runLimited<T>(
  db: Firestore,
  ctx: { uid: string; now: number },
  key: RateLimitKey,
  body: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const outcome = await db.runTransaction(async (tx) => {
    const limit = await checkRateLimit(db, tx, ctx.uid, key, ctx.now);
    if (!limit.allowed) {
      return { error: new ApiError('resource-exhausted', 'rate-limited') } as const;
    }
    try {
      const value = await body(tx);
      limit.commit();
      return { value } as const;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      limit.commit();
      return { error } as const;
    }
  });
  if ('error' in outcome) throw outcome.error;
  return outcome.value;
}
