# Architecture de Grand Line Duel

Ce document décrit les choix techniques, le modèle de données Firestore, l'API serveur, le plan de
tests et les interprétations de règles retenues. Il est la référence pour reprendre le projet.

## 1. Vue d'ensemble

```
┌──────────────────────┐   intentions de coups (callables)   ┌──────────────────────────┐
│  packages/web        │ ──────────────────────────────────▶ │  packages/functions      │
│  React + Vite (PWA)  │                                     │  Cloud Functions v2      │
│  lit l'état en temps │ ◀────────── onSnapshot ──────────── │  (autorité, transactions)│
│  réel, n'écrit rien  │          Firestore (lecture)        │  valide avec engine      │
└─────────┬────────────┘                                     └────────────┬─────────────┘
          │ importe                                                       │ importe (bundlé)
          ▼                                                               ▼
                         ┌──────────────────────────────────┐
                         │  packages/engine                 │
                         │  règles pures et déterministes   │
                         │  applyMove / getLegalMoves       │
                         └──────────────────────────────────┘
```

### Choix et justifications

| Choix | Justification |
| --- | --- |
| **Monorepo npm workspaces** (`engine`, `functions`, `web`) | Un seul dépôt, un seul `npm ci`, le moteur est partagé sans publication. Pas besoin d'outil supplémentaire (Nx, Turborepo) pour trois paquets. |
| **Moteur « juste-à-temps »** (`main` pointe vers `src/index.ts`) | Pas d'étape de build pour `engine` : Vite (web), esbuild (functions) et Vitest compilent directement le TypeScript. Moins de configuration, aucun risque de `dist` périmé. |
| **État séparé `pub` / `sec`** dans le moteur | Le moteur manipule un `GameState = { pub, sec }`. `pub` est exactement ce qui est publié aux deux joueurs ; `sec` (ordre des paquets, sac, graine, cartes réservées) ne quitte jamais le serveur. La séparation est structurelle, pas un filtrage après coup. |
| **Hasard par graine** (mulberry32, état 32 bits dans `sec.rng`) | `applyMove` est pur et rejouable ; la graine est tirée par le serveur avec `crypto.randomInt` et n'est jamais exposée. |
| **Cloud Functions callables (v2)** | Authentification et App Check vérifiés par le SDK, sérialisation simple, pas d'API REST à maintenir. Région `europe-west1` (joueurs francophones). |
| **Bundle esbuild des Functions** | Cloud Build ne sait pas résoudre une dépendance de workspace (`@gld/engine`). Le build produit `packages/functions/dist/` (code bundlé + `package.json` minimal) qui est la source déployée. |
| **Firestore en lecture seule côté client** | Toutes les écritures passent par les Functions. Les règles sont `deny` par défaut et n'autorisent que des lectures ciblées. |
| **React 19 + Vite + react-router** | Écosystème standard, rapide, PWA via `vite-plugin-pwa`. Pas de gestionnaire d'état global : l'état de jeu vient de Firestore, quelques hooks suffisent. |
| **CSS natif avec variables** | Thème centralisé (`src/theme.css` + `src/theme.ts`), aucune dépendance UI, animations CSS légères. |
| **Vitest** | Même outil pour le moteur et les tests d'intégration sur émulateur, support natif de TypeScript/ESM. |

## 2. Arborescence

```
.
├── .github/workflows/ci.yml        # lint, typecheck, tests, émulateur, build, déploiement
├── docs/ARCHITECTURE.md            # ce document
├── PROGRESS.md                     # suivi des phases et décisions
├── README.md                       # guide d'installation et de déploiement (FR)
├── firebase.json                   # hosting (en-têtes de sécurité), functions, firestore, émulateurs
├── .firebaserc.example             # alias de projet à copier
├── firestore.rules                 # deny by default
├── firestore.indexes.json
├── eslint.config.js / .prettierrc.json / tsconfig.base.json
└── packages/
    ├── engine/                     # moteur de règles pur
    │   ├── data/cards.json         # 67 cartes + 4 cartes Empereur (validées par Zod)
    │   ├── src/
    │   │   ├── types.ts            # types du domaine, coups, état, journal
    │   │   ├── schema.ts           # schémas Zod (données de cartes, coups)
    │   │   ├── cards.ts            # chargement/validation des données
    │   │   ├── rng.ts              # PRNG déterministe
    │   │   ├── board.ts            # plateau 5×5, spirale, lignes
    │   │   ├── player.ts           # bonus, couronnes, points, paiement
    │   │   ├── setup.ts            # mise en place
    │   │   ├── rules.ts            # légalité : validateMove / getLegalMoves
    │   │   ├── apply.ts            # applyMove, fin de tour, victoire, abandon
    │   │   ├── view.ts             # projections publiques / joueur
    │   │   └── index.ts
    │   └── test/                   # tests unitaires et parties aléatoires
    ├── functions/
    │   ├── build.mjs               # bundle esbuild → dist/
    │   ├── src/                    # handlers (profil, salons, coups, nettoyage)
    │   └── test/                   # tests sur émulateur (règles + handlers)
    └── web/
        ├── public/                 # icônes PWA, favicon
        ├── src/
        │   ├── assets/             # SVG originaux (ressources, logo, dos de cartes…)
        │   ├── theme.ts / theme.css
        │   ├── firebase.ts / api.ts
        │   ├── hooks/ components/ pages/
        │   └── main.tsx
        └── vite.config.ts
```

## 3. Modèle de données Firestore

Toutes les écritures sont faites par les Cloud Functions (SDK Admin). Le client ne fait que lire.

| Chemin | Contenu | Lecture client |
| --- | --- | --- |
| `users/{uid}` | `nickname`, `avatar`, `stats {played, wins, losses, abandons}`, `currentGameId`, `createdAt`, `updatedAt` | propriétaire uniquement |
| `users/{uid}/history/{gameId}` | `endedAt`, `opponent {nickname, avatar}`, `result` (`win`/`loss`), `reason`, `myPoints`, `opponentPoints`, `turns` | propriétaire uniquement |
| `games/{gameId}` | salon + partie publique (voir ci-dessous) | joueurs du salon uniquement |
| `games/{gameId}/private/{uid}` | `reserved: string[]` — cartes réservées du joueur | ce joueur uniquement |
| `gameSecrets/{gameId}` | `sec` : graine, paquets ordonnés, sac, cartes réservées des deux joueurs | **jamais** |
| `roomCodes/{code}` | `gameId`, `createdAt` | **jamais** (rejoindre passe par une Function) |
| `rateLimits/{uid}` | compteurs de limitation de débit | **jamais** |

### Document `games/{gameId}`

```ts
{
  code: string;                       // code court du salon (6 caractères)
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  hostUid: string;
  players: { uid; nickname; avatar }[]; // index = siège (0 = hôte)
  playerUids: string[];               // pour les règles de sécurité et les requêtes
  createdAt; updatedAt; startedAt | null; endedAt | null;
  version: number;                    // incrémenté à chaque coup (concurrence optimiste)
  state: PublicState | null;          // état public du moteur (null en attente)
  turnDeadline: Timestamp | null;     // fin du délai du joueur actif
  lastMove: { id; seat; version } | null; // idempotence des coups
  result: { winner: 0 | 1 | null; reason } | null;
  rematch: { requestedBy: string[]; gameId: string | null };
}
```

`PublicState` (moteur) contient : plateau (25 cases), nombre de jetons dans le sac, Log Pose
disponibles, pyramide (identifiants des cartes visibles), nombre de cartes par paquet, cartes
Empereur disponibles, joueurs (jetons, Log Pose, cartes achetées avec couleur associée, cartes
Empereur, **niveaux** des cartes réservées — jamais leur identité), joueur actif, drapeaux du
tour, décisions en attente, vainqueur, journal structuré.

### Index composites (`firestore.indexes.json`)

- `games` : `status ASC, createdAt ASC` — nettoyage des salons en attente expirés.
- `games` : `status ASC, turnDeadline ASC` — nettoyage des parties inactives.

## 4. API serveur (callables, région `europe-west1`)

| Function | Entrée | Effet |
| --- | --- | --- |
| `saveProfile` | `{ nickname, avatar }` | crée/met à jour le profil (pseudo assaini) |
| `createRoom` | `{}` | crée un salon `waiting` + code ; renvoie le salon existant si l'hôte en a déjà un |
| `joinRoom` | `{ code }` | rejoint un salon, démarre la partie (premier joueur tiré au sort) ; refuse si plein |
| `submitMove` | `{ gameId, move, expectedVersion, moveId }` | valide et applique un coup dans une transaction |
| `leaveGame` | `{ gameId }` | annule un salon en attente, ou abandonne une partie en cours |
| `claimTimeout` | `{ gameId }` | l'adversaire réclame la victoire quand le délai du joueur actif est dépassé |
| `requestRematch` | `{ gameId }` | demande de revanche ; nouvelle partie quand les deux joueurs l'ont demandée |
| `cleanupGames` (planifiée) | — | expire les salons en attente et clôt les parties abandonnées |

Chaque callable : App Check imposé (hors émulateur), authentification requise, entrée validée par
Zod, limitation de débit transactionnelle, erreurs `HttpsError` avec un code stable que le client
traduit en français.

## 5. Plan de tests

**Moteur (Vitest, `packages/engine/test`)**

- Données : 30/24/13 cartes, 4 cartes Empereur, identifiants uniques, cohérence capacités/bonus.
- Mise en place : spirale, 25 jetons, pyramide 3/4/5, paquets restants, Log Pose du second joueur,
  déterminisme par graine.
- Prise de jetons : lignes, colonnes, diagonales, adjacence, case vide, Or interdit, doublons,
  plus de 3 jetons, Log Pose à l'adversaire (3 identiques, 2 Fruits du Démon).
- Log Pose : utilisation, Or interdit, ordre des actions optionnelles, épuisement (prise chez
  l'adversaire), 3 Log Pose déjà possédés.
- Remplissage : ordre en spirale, sac vide, Log Pose à l'adversaire, une seule fois par tour.
- Réservation : Or requis, 3 réservations max, depuis la pyramide ou un paquet, paquet vide,
  information cachée.
- Achat : bonus, Or joker, coût nul, jetons au sac, cartes réservées, remplacement.
- Capacités : rejouer (non cumulable), joker (couleur, prérequis), jeton (absent), Log Pose,
  vol (jamais d'Or, rien à voler).
- Primes : 3e et 6e Prime, cartes Empereur et leurs capacités, plus de carte disponible.
- Fin de tour : limite de 10 jetons, défausse exacte.
- Victoire : 20 Renommée (cartes Empereur incluses), 10 Primes, 10 Renommée d'une couleur
  (joker inclus), vérifiée seulement en fin de tour.
- Parties aléatoires complètes : conservation des 25 jetons, 3 Log Pose, 67 cartes, cohérence
  `getLegalMoves` ⇔ `validateMove`.

**Serveur (émulateur Firestore, `packages/functions/test`)**

- Règles : lecture refusée hors joueurs, document privé réservé au propriétaire, secrets et codes
  illisibles, toute écriture client refusée.
- Handlers : création/jonction de salon, salon plein, partie démarrée, coup hors tour, version
  périmée, idempotence, coup illégal, information cachée non publiée, abandon, délai, revanche,
  statistiques et historique, limitation de débit.

## 6. Interprétations de règles

Voir la section « Décisions » de `PROGRESS.md` (tenue à jour) : gain de Log Pose quand la réserve
est vide, joker sans carte à bonus, tours supplémentaires non cumulables, ordre de résolution
capacité → cartes Empereur → défausse → victoire, paiement automatique, coup « passer » de secours.
