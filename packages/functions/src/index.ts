/**
 * Point d'entrée des Cloud Functions : uniquement le câblage (App Check, authentification,
 * traduction des erreurs). La logique est dans les handlers, testés sur l'émulateur.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { setGlobalOptions } from 'firebase-functions/options';
import { onSchedule } from 'firebase-functions/scheduler';
import { REGION } from './config.js';
import { ApiError } from './errors.js';
import type { Ctx } from './paths.js';
import * as cleanup from './cleanup.js';
import * as play from './play.js';
import * as profile from './profile.js';
import * as rooms from './rooms.js';

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

setGlobalOptions({ region: REGION, maxInstances: 10, memory: '256MiB' });

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
// Origines autorisées (CORS), ex. "https://mon-projet.web.app,https://mon-domaine.fr".
// Vide = toutes (l'authentification et App Check restent obligatoires).
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

type Handler<T> = (db: Firestore, ctx: Ctx, data: unknown) => Promise<T>;

function callable<T>(handler: Handler<T>) {
  return onCall(
    {
      enforceAppCheck: !isEmulator,
      cors: allowedOrigins.length > 0 ? allowedOrigins : true,
      timeoutSeconds: 20,
    },
    async (request) => {
      if (!request.auth) throw new HttpsError('unauthenticated', 'unauthenticated');
      try {
        return await handler(db, { uid: request.auth.uid, now: Date.now() }, request.data);
      } catch (error) {
        if (error instanceof ApiError) throw error.toHttpsError();
        if (error instanceof HttpsError) throw error;
        logger.error('Erreur inattendue', error);
        throw new HttpsError('internal', 'internal');
      }
    },
  );
}

export const saveProfile = callable(profile.saveProfile);
export const createRoom = callable(rooms.createRoom);
export const joinRoom = callable(rooms.joinRoom);
export const leaveGame = callable(rooms.leaveGame);
export const submitMove = callable(play.submitMove);
export const claimTimeout = callable(play.claimTimeout);
export const requestRematch = callable(play.requestRematch);

export const cleanupGames = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Europe/Paris', timeoutSeconds: 300 },
  async () => {
    const result = await cleanup.cleanupGames(db, Date.now());
    logger.info('Nettoyage des parties', result);
  },
);
