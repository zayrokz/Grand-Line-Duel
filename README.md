# 🏴‍☠️ Grand Line Duel

Adaptation web **non commerciale** des mécaniques de _Splendor Duel_ (Marc André & Bruno Cathala,
Space Cowboys), revisitée dans un univers de pirates original. Deux joueurs s'affrontent en ligne,
chacun sur son appareil (PC ou téléphone) : le premier à remplir une condition de « Le Trésor »
(20 Renommée, 10 Primes ou 10 Renommée d'une même couleur) l'emporte.

> ⚠️ **Données de cartes de substitution.** `packages/engine/data/cards.json` est un jeu de données
> **généré et équilibré, non officiel** (quantités et mécaniques respectées : 30/24/13 cartes,
> 4 cartes Empereur). Remplacez-le par la liste exacte si vous la possédez (voir plus bas).
>
> Aucune image, aucun logo ni nom de personnage officiel de One Piece ou de Splendor n'est utilisé :
> toutes les illustrations sont des SVG originaux ou des emojis, centralisés et remplaçables.

| Jeu original      | Grand Line Duel                                        |
| ----------------- | ------------------------------------------------------ |
| Gemmes (5)        | Provisions, Cartes marines, Bois, Rhum, Poudre à canon |
| Perles            | Fruits du Démon                                        |
| Or                | Berrys                                                 |
| Privilèges        | Log Pose                                               |
| Cartes Joaillerie | Cartes Équipage / Navire / Équipement                  |
| Prestige          | Renommée                                               |
| Couronnes         | Primes                                                 |
| Cartes Royales    | Cartes Empereur                                        |
| Carte Victoire    | Le Trésor                                              |

## Sommaire

1. [Architecture](#architecture)
2. [Installation locale](#installation-locale)
3. [Lancer avec les émulateurs](#lancer-avec-les-émulateurs)
4. [Tests et qualité](#tests-et-qualité)
5. [Configurer le projet Firebase](#configurer-le-projet-firebase)
6. [Déployer via GitHub Actions](#déployer-via-github-actions)
7. [Remplacer les assets et les données de cartes](#remplacer-les-assets-et-les-données-de-cartes)
8. [Règles, sécurité et suivi](#règles-sécurité-et-suivi)

## Architecture

Monorepo TypeScript (npm workspaces) — détails et justifications dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```
packages/
  engine/      moteur de règles pur et déterministe (partagé client/serveur) + données de cartes
  functions/   Cloud Functions autoritaires (valident chaque coup avec le moteur, en transaction)
  web/         client React + Vite (PWA), lecture temps réel, n'écrit jamais l'état de jeu
firestore.rules         règles « deny by default »
firestore.indexes.json  index composites
firebase.json           Hosting (en-têtes de sécurité), Functions, Firestore, émulateurs
.github/workflows/ci.yml  lint, typecheck, tests, émulateurs, build, déploiement
```

- **Serveur autoritaire** : le client envoie des _intentions_ (`submitMove`) ; la Function vérifie
  authentification, appartenance au salon, tour, version et légalité, puis écrit le nouvel état.
- **Information cachée** : paquets, sac, graine et réserves sont dans `gameSecrets/{id}` (illisible) ;
  chaque joueur lit ses propres réserves dans `games/{id}/private/{uid}`.
- **Hasard** : SHA-256 en mode compteur sur une graine secrète de 256 bits tirée par le serveur.

## Installation locale

Prérequis :

- **Node.js 22** (voir `.nvmrc`) et npm 10 ;
- **Java 21** (pour les émulateurs Firestore/Auth) ;
- la CLI Firebase est fournie en dépendance de développement (`npx firebase …`).

```bash
git clone <votre-dépôt> grand-line-duel
cd grand-line-duel
npm ci
```

## Lancer avec les émulateurs

Aucun projet Firebase n'est nécessaire : un projet de démonstration (`demo-grand-line-duel`) est
utilisé et le client de développement se connecte automatiquement aux émulateurs
(`packages/web/.env.development` contient `VITE_USE_EMULATORS=true`).

```bash
# Terminal 1 — build des Functions puis émulateurs Auth, Firestore, Functions, Hosting
npm run emulators

# Terminal 2 — client web avec rechargement à chaud
npm run dev
```

- Application : <http://localhost:5173> — ouvrez une seconde fenêtre **privée** (ou un autre
  navigateur) pour jouer le second joueur ;
- Interface des émulateurs : <http://127.0.0.1:4000>.

Après une modification de `packages/functions/src`, relancez `npm run emulators` (le code est
bundlé dans `packages/functions/dist`).

## Tests et qualité

```bash
npm run check          # lint + format + typecheck + tests du moteur
npm test               # tests unitaires du moteur (Vitest)
npm run test:emulator  # règles Firestore + handlers des Functions sur l'émulateur Firestore
npm run build          # build des Functions (esbuild) et du client (Vite + PWA)
npm run format         # formate tout le dépôt (Prettier)
```

Le moteur est couvert règle par règle (adjacence, Or interdit, limite de 10 jetons, 3 réservations,
Log Pose épuisés, remplissage, chaque capacité, seuils de Primes, les trois victoires, tour
supplémentaire) et par des parties aléatoires complètes vérifiant les invariants.

## Configurer le projet Firebase

1. **Créer le projet** dans la [console Firebase](https://console.firebase.google.com) et passer au
   **plan Blaze** (obligatoire pour Cloud Functions et Cloud Scheduler). Configurez une alerte de
   budget dans Google Cloud.
2. **Firestore** : créer la base en mode production, de préférence dans une région européenne
   (ex. `eur3` ou `europe-west1`).
3. **Authentication** → _Méthodes de connexion_ : activer **Anonyme**, **Google** et
   **Adresse e-mail/Mot de passe**. Dans _Paramètres → Domaines autorisés_, ajouter vos domaines
   d'hébergement (`<projet>.web.app`, domaine personnalisé…).
4. **Application web** : _Paramètres du projet → Vos applications → Ajouter une application Web_.
   Copiez la configuration dans `packages/web/.env.local` (modèle : `packages/web/.env.example`).
   Pour une connexion Google fiable (navigateurs bloquant les cookies tiers),
   utilisez votre domaine d'hébergement comme `VITE_FIREBASE_AUTH_DOMAIN`.
5. **App Check** :
   - créez une clé **reCAPTCHA Enterprise** (Google Cloud → Security → reCAPTCHA) pour vos domaines ;
   - enregistrez l'application web dans _App Check_ avec ce fournisseur et renseignez
     `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` ;
   - les Functions **imposent** déjà App Check ; dans _App Check → API_, cliquez **Appliquer** pour
     **Cloud Firestore** une fois les premières requêtes valides observées ;
   - en développement contre le vrai projet, générez un jeton de débogage, enregistrez-le dans la
     console et placez-le dans `VITE_APPCHECK_DEBUG_TOKEN` (ne le commitez jamais).
6. **Projet par défaut de la CLI** : `cp .firebaserc.example .firebaserc` puis indiquez l'ID du projet.
7. **Paramètres des Functions** (facultatif) : `cp packages/functions/.env.example packages/functions/.env`
   et listez les origines autorisées (`ALLOWED_ORIGINS`).
8. **Premier déploiement manuel** (facultatif) :
   ```bash
   npx firebase login
   npm run deploy   # build + firebase deploy --only firestore,functions,hosting
   ```
   Les index de `firestore.indexes.json` sont créés automatiquement (quelques minutes).

Les Functions sont déployées dans **`europe-west1`** (constante `FUNCTIONS_REGION` de
`packages/engine/src/protocol.ts`, partagée avec le client).

## Déployer via GitHub Actions

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) exécute à chaque push et pull
request : lint, format, typecheck, tests du moteur, tests sur émulateur et build. Sur la branche
**`main`**, il déploie ensuite Firestore (règles + index), les Functions et le Hosting.

1. **Compte de service** (Google Cloud → IAM → Comptes de service) dédié au déploiement, avec les
   rôles : _Firebase Admin_, _Cloud Functions Admin_, _Service Account User_, _Cloud Scheduler Admin_,
   _Artifact Registry Administrator_ et _Service Usage Consumer_ (à restreindre selon vos besoins).
   Créez une clé JSON.
   > Plus sûr : utilisez la [Workload Identity Federation](https://github.com/google-github-actions/auth#workload-identity-federation-through-a-service-account)
   > (aucune clé longue durée) en remplaçant `credentials_json` par `workload_identity_provider` et
   > `service_account` dans le workflow (`permissions: id-token: write`).
2. Dans GitHub : _Settings → Environments_, créez l'environnement **`production`** (vous pouvez y
   exiger une approbation manuelle).
3. **Secret** de l'environnement `production` :
   - `FIREBASE_SERVICE_ACCOUNT` : contenu de la clé JSON.
4. **Variables** (_Settings → Secrets and variables → Actions → Variables_) — publiques par nature :
   `FIREBASE_PROJECT_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, `ALLOWED_ORIGINS`.
5. Poussez sur `main` : le job « Déploiement Firebase » s'exécute après tous les tests.

**Public / secret** : la configuration web Firebase et la clé de site reCAPTCHA sont publiques (elles
sont servies au navigateur) ; la sécurité repose sur les règles Firestore, l'authentification et
App Check. Seule la clé du compte de service est secrète. Aucun secret n'est présent dans le dépôt.

## Remplacer les assets et les données de cartes

### Habillage

| Quoi                                        | Où                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Noms, couleurs, icônes des ressources       | `packages/web/src/theme.ts` (`RESOURCES`)                                               |
| Vocabulaire (Log Pose, Primes, Renommée…)   | `packages/web/src/theme.ts` (`TERMS`, `ABILITIES`…)                                     |
| Couleurs de l'interface, typographies       | `packages/web/src/theme.css`                                                            |
| Icônes des jetons                           | `packages/web/src/assets/tokens/<couleur>.svg`                                          |
| Log Pose, Prime, Trésor, logo, dos de carte | `packages/web/src/assets/*.svg`                                                         |
| Illustration d'une carte                    | déposer `packages/web/src/assets/cards/<id>.webp` (ou png, jpg, svg) — ex. `L2-07.webp` |
| Illustration d'une carte Empereur           | `packages/web/src/assets/royals/E1.webp` … `E4.webp`                                    |
| Icônes PWA / favicon                        | `packages/web/public/` (`favicon.svg`, `icons/*.png`)                                   |

Une image déposée remplace automatiquement le placeholder (emoji) de la carte, sans autre
modification. N'utilisez que des illustrations dont vous détenez les droits.

### Données de cartes

`packages/engine/data/cards.json` est validé au chargement par Zod (`packages/engine/src/schema.ts`) :
un fichier incohérent fait échouer le serveur, le client et les tests avec un message explicite.
Les couleurs internes reprennent celles du jeu original (`white`, `blue`, `green`, `red`, `black`,
`pearl`) pour faciliter la saisie de la liste exacte :

```jsonc
{
  "id": "L2-07", // L<niveau>-<numéro à 2 chiffres>, unique
  "level": 2, // 1, 2 ou 3 (30 / 24 / 13 cartes exigées)
  "name": "Navigatrice",
  "kind": "crew", // crew (Équipage), ship (Navire), gear (Équipement)
  "art": "🧭", // placeholder affiché sans image
  "bonus": "blue", // couleur, "joker" ou null (aucun bonus)
  "bonusCount": 1, // 0 si bonus null, 1 pour un joker, 1 ou 2 sinon
  "points": 2, // Renommée
  "crowns": 1, // Primes
  "ability": "privilege", // extraTurn | token | privilege | steal | null
  "cost": { "white": 2, "red": 3, "pearl": 1 }, // jamais d'Or
}
```

Les 4 cartes Empereur se trouvent dans `royals` (`id` `E1`…`E4`, `points`, `ability` parmi
`extraTurn | privilege | steal | null`). Après remplacement :

1. passez `"placeholder"` à `false` et mettez à jour `$comment` ;
2. lancez `npm test` (les tests de scénarios sélectionnent les cartes par propriétés : ajustez-les
   si votre liste ne contient plus de carte correspondante) ;
3. redéployez (les parties en cours conservent leurs identifiants de cartes : évitez de renuméroter
   pendant que des parties sont actives).

## Règles, sécurité et suivi

- Règles jouées, avec l'habillage pirate : page **Règles** de l'application.
- Interprétations des points ambigus des règles et décisions techniques : [`PROGRESS.md`](PROGRESS.md).
- Revue de sécurité (menaces et parades) : [`docs/SECURITY.md`](docs/SECURITY.md).
- Modèle de données Firestore et API : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Projet personnel, non commercial et non affilié aux ayants droit de _Splendor Duel_ ou de _One Piece_.
