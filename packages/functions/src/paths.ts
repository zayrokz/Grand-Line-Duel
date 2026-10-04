import type { Firestore } from 'firebase-admin/firestore';

/** Références Firestore centralisées (voir docs/ARCHITECTURE.md, modèle de données). */
export const refs = (db: Firestore) => ({
  user: (uid: string) => db.collection('users').doc(uid),
  history: (uid: string, gameId: string) =>
    db.collection('users').doc(uid).collection('history').doc(gameId),
  games: () => db.collection('games'),
  game: (gameId: string) => db.collection('games').doc(gameId),
  private: (gameId: string, uid: string) =>
    db.collection('games').doc(gameId).collection('private').doc(uid),
  secret: (gameId: string) => db.collection('gameSecrets').doc(gameId),
  roomCode: (code: string) => db.collection('roomCodes').doc(code),
  rateLimit: (uid: string) => db.collection('rateLimits').doc(uid),
});

export interface Ctx {
  uid: string;
  now: number;
}
