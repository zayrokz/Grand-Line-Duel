import { Timestamp } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { forfeit } from '@gld/engine';
import { STALE_GAME_MS, WAITING_ROOM_TTL_MS } from './config.js';
import { endGameWrites } from './games.js';
import type { StoredGame } from './games.js';
import { refs } from './paths.js';

/**
 * Nettoyage planifié : expire les salons en attente trop anciens et clôt les parties dont le
 * joueur actif a dépassé son délai depuis longtemps sans que l'adversaire ne réclame la victoire
 * (défaite par dépassement du délai pour le joueur actif).
 */
export async function cleanupGames(
  db: Firestore,
  now: number,
): Promise<{ expired: number; closed: number }> {
  let expired = 0;
  let closed = 0;
  const ts = Timestamp.fromMillis(now);

  const waiting = await refs(db)
    .games()
    .where('status', '==', 'waiting')
    .where('createdAt', '<', Timestamp.fromMillis(now - WAITING_ROOM_TTL_MS))
    .limit(200)
    .get();
  for (const doc of waiting.docs) {
    await db.runTransaction(async (tx) => {
      const game = (await tx.get(doc.ref)).data() as StoredGame | undefined;
      if (game?.status !== 'waiting') return;
      const host = await tx.get(refs(db).user(game.hostUid));
      tx.update(doc.ref, {
        status: 'abandoned',
        endedAt: ts,
        updatedAt: ts,
        result: { winner: null, reason: 'expired' },
      });
      if (game.code) tx.delete(refs(db).roomCode(game.code));
      if (host.get('currentGameId') === doc.id) {
        tx.set(
          refs(db).user(game.hostUid),
          { currentGameId: null, updatedAt: ts },
          { merge: true },
        );
      }
      expired++;
    });
  }

  const stale = await refs(db)
    .games()
    .where('status', '==', 'playing')
    .where('turnDeadline', '<', Timestamp.fromMillis(now - STALE_GAME_MS))
    .limit(100)
    .get();
  for (const doc of stale.docs) {
    await db.runTransaction(async (tx) => {
      const game = (await tx.get(doc.ref)).data() as StoredGame | undefined;
      if (game?.status !== 'playing' || !game.state) return;
      const pub = forfeit(game.state, game.state.current, 'timeout');
      tx.update(doc.ref, {
        ...endGameWrites(db, tx, doc.id, game, pub, now),
        version: game.version + 1,
      });
      closed++;
    });
  }
  return { expired, closed };
}
