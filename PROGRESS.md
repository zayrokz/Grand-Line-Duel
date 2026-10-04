# PROGRESS — Grand Line Duel

Fichier de suivi pour reprendre le travail d'une session à l'autre.

## État des phases

| Phase | Statut |
| --- | --- |
| 1. Architecture, modèle de données, arborescence, plan de tests | ✅ fait (`docs/ARCHITECTURE.md`) |
| 2. Moteur de règles et tests | ⏳ en cours |
| 3. Cloud Functions, règles Firestore, tests émulateur | à faire |
| 4. Interface (accueil, profil, salon, plateau, fin de partie) | à faire |
| 5. CI/CD, PWA, en-têtes de sécurité, README | à faire |

## Fait

- Monorepo npm workspaces (`packages/engine`, `packages/functions`, `packages/web`).
- Configuration TypeScript strict (TS 6.0 — la 7.x n'est pas encore supportée par typescript-eslint),
  ESLint 10 (flat config), Prettier.
- Document d'architecture et modèle de données.

## En cours

- Moteur de règles.

## À faire

- Voir les phases ci-dessus.

## Décisions prises

- **Versions** : TypeScript `~6.0.3` (typescript-eslint exige `<6.1`), Node 22.
- **Moteur sans build** : `@gld/engine` expose directement `src/index.ts`.
- **État `pub`/`sec`** : séparation structurelle de l'information publique et secrète.
