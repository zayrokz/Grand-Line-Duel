/**
 * Initialisation Firebase côté client. La configuration web est publique par nature ; elle est
 * injectée au build par les variables `VITE_FIREBASE_*` (voir `.env.example`).
 */
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { FUNCTIONS_REGION } from '@gld/engine';

const env = import.meta.env;
export const USE_EMULATORS = env.VITE_USE_EMULATORS === 'true';

const app = initializeApp(
  USE_EMULATORS && !env.VITE_FIREBASE_PROJECT_ID
    ? {
        apiKey: 'demo-key',
        authDomain: 'localhost',
        projectId: 'demo-grand-line-duel',
        appId: 'demo',
      }
    : {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        appId: env.VITE_FIREBASE_APP_ID,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      },
);

// App Check : atteste que les requêtes viennent de notre application (imposé côté serveur).
if (!USE_EMULATORS) {
  if (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      env.VITE_APPCHECK_DEBUG_TOKEN;
  }
  const siteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn('App Check non initialisé : VITE_RECAPTCHA_ENTERPRISE_SITE_KEY manquant.');
  }
}

export const auth = getAuth(app);
auth.languageCode = 'fr';
export const db = getFirestore(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
