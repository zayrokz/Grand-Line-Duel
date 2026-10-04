import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Les parties aléatoires complètes (40 parties, invariants vérifiés à chaque coup) prennent
    // quelques secondes : marge pour les machines de CI chargées.
    testTimeout: 30_000,
  },
});
