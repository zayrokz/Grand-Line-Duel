import { defineConfig } from 'vitest/config';

// Tests d'intégration : ils exigent l'émulateur Firestore (lancés via `npm run test:emulator`
// à la racine, qui utilise `firebase emulators:exec`). Exécution séquentielle : les fichiers
// partagent la même base émulée.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
