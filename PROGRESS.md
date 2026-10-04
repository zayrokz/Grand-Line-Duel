# PROGRESS — Grand Line Duel

Fichier de suivi pour reprendre le travail d'une session à l'autre.

## État des phases

| Phase                                                           | Statut                            |
| --------------------------------------------------------------- | --------------------------------- |
| 1. Architecture, modèle de données, arborescence, plan de tests | ✅ fait (`docs/ARCHITECTURE.md`)  |
| 2. Moteur de règles et tests                                    | ✅ fait (81 tests)                |
| 3. Cloud Functions, règles Firestore, tests émulateur           | ✅ fait (26 tests émulateur)      |
| 4. Interface (accueil, profil, salon, plateau, fin de partie)   | ✅ fait (validée de bout en bout) |
| 5. CI/CD, PWA, en-têtes de sécurité, README                     | ⏳ en cours                       |

## Fait

- Monorepo npm workspaces (`packages/engine`, `packages/functions`, `packages/web`).
- Configuration TypeScript strict (TS 6.0 — la 7.x n'est pas encore supportée par typescript-eslint),
  ESLint 10 (flat config), Prettier.
- Document d'architecture et modèle de données.
- Moteur `@gld/engine` : types, données validées par Zod, PRNG à graine, plateau/spirale,
  `validateMove`, `getLegalMoves`, `applyMove`, `forfeit`, vues joueur, schéma des coups.
- Données de cartes **de substitution** (`packages/engine/data/cards.json`, `placeholder: true`).
- Tests moteur : données, plateau, mise en place, jetons, Log Pose, remplissage, réservation, achat,
  capacités, Primes/cartes Empereur, défausse, victoires, abandon, 40 parties aléatoires complètes
  avec invariants (25 jetons, 3 Log Pose, 67 cartes, 4 Empereurs, aucun secret dans l'état public).

- Contrat partagé client/serveur (`packages/engine/src/protocol.ts`) : documents Firestore,
  codes d'erreur, validation du pseudo, des avatars, des codes de salon et des identifiants.
- Cloud Functions (`packages/functions`) : `saveProfile`, `createRoom`, `joinRoom`, `leaveGame`,
  `submitMove`, `claimTimeout`, `requestRematch`, `cleanupGames` (planifiée). App Check imposé hors
  émulateur, CORS configurable (`ALLOWED_ORIGINS`), limitation de débit transactionnelle.
- Build esbuild → `packages/functions/dist` (source déployée, `package.json` sans dépendance de
  workspace). Vérifié de bout en bout dans l'émulateur Functions + Auth.
- `firestore.rules` (deny by default), `firestore.indexes.json`, `firebase.json` (hosting avec
  en-têtes de sécurité, functions, émulateurs).
- Tests émulateur : 6 tests de règles + 20 tests de handlers.

- Client web (`packages/web`, React 19 + Vite 8 + react-router 7) : accueil (profil, créer,
  rejoindre, reprendre), profil (pseudo, avatar, statistiques, historique, liaison Google / e-mail),
  salon d'attente (code, lien de partage), plateau temps réel, décisions guidées, journal, délai de
  tour et réclamation, abandon, fin de partie et revanche, page de règles.
- Thème centralisé (`src/theme.ts`, `src/theme.css`) et SVG originaux (`src/assets/`) ;
  illustrations de cartes remplaçables par simple dépôt de fichier (`assets/cards/<id>.webp`).
- Mise en page mobile d'abord (cases ≥ 46 px, boutons ≥ 44 px), tablette et bureau (3 colonnes).
- Vérifié avec Playwright sur émulateurs (bureau 1440×900 + mobile 390×844) : création/jonction,
  prises de jetons, achat d'une carte joker → couleur → carte Empereur → vol, défausse, victoire,
  revanche, historique ; aucune erreur console.

## En cours

- CI/CD, PWA, en-têtes, README.

## À faire

- Phase 5.

## Décisions prises

### Techniques

- **Versions** : TypeScript `~6.0.3` (typescript-eslint exige `<6.1`), Node 22.
- **Moteur sans build** : `@gld/engine` expose directement `src/index.ts`.
- **État `pub`/`sec`** : séparation structurelle de l'information publique et secrète.
- **Identifiants internes** = couleurs du jeu original (`white`, `blue`, `green`, `red`, `black`,
  `pearl`, `gold`) pour pouvoir brancher la vraie liste de cartes ; l'habillage pirate est dans le
  thème du client (Provisions, Cartes marines, Bois, Rhum, Poudre à canon, Fruit du Démon, Berry).
- **Coups référencés par identifiant de carte** (et non par position) : un clic sur une pyramide
  périmée échoue proprement au lieu d'acheter une autre carte.
- **Journal structuré** (`pub.log`, 300 entrées max) traduit en français par le client ; il ne
  contient jamais l'identité d'une carte réservée.

- **Toutes les écritures Firestore via les Functions** : les règles n'autorisent que des lectures.
- **Quota consommé même en cas de refus** (`runLimited`) : un script ne peut pas marteler des coups
  illégaux ou deviner des codes de salon. Convention : un handler vérifie tout avant d'écrire.
- **Idempotence** : `lastMove.id` ; un `moveId` rejoué renvoie la version déjà appliquée.
  **Concurrence** : `expectedVersion` + transaction ; une version périmée renvoie `stale-version`.
- **Une seule partie active par joueur** : créer/rejoindre est refusé pendant une partie en cours ;
  rejoindre un autre salon annule son propre salon en attente.
- **Délai de tour** : 5 minutes (`TURN_TIMEOUT_MS`) ; seul l'adversaire peut réclamer la victoire.
  Le nettoyage horaire expire les salons en attente (> 6 h) et clôt les parties inactives (> 24 h
  après le délai) par défaite du joueur actif.
- **Statut `abandoned`** : abandon, dépassement du délai ou salon expiré/annulé ; `finished` :
  victoire normale.

- **Sélection liée à la version** : l'état local de sélection (jetons, mode Log Pose…) est indexé
  par `game.version` et se réinitialise à chaque coup, sans `setState` dans un effet.
- **Barre d'action collante** (`position: sticky`) : elle ne masque jamais le plateau, même quand une
  décision (défausse, cartes Empereur) l'agrandit.

### Interprétations de règles (ambiguïtés signalées)

1. **Gain de Log Pose réserve vide** : la règle « s'il n'en reste aucun, le prendre à
   l'adversaire » est appliquée à _tous_ les gains (capacité, remplissage, prise de 3 identiques,
   mise en place), comme dans la règle complète du jeu. Si le joueur a déjà les 3, rien ne se passe.
2. **Carte joker** : achat impossible sans carte possédant au moins 1 bonus coloré (sinon aucune
   carte à laquelle l'associer). Le joueur choisit la couleur parmi celles de ses bonus.
3. **Rejouer non cumulable** : plusieurs effets « rejouer » dans un même tour (carte + carte
   Empereur) ne donnent qu'un seul tour supplémentaire.
4. **Ordre de résolution d'un achat** : capacité de la carte (joker, jeton, vol, Log Pose,
   rejouer) → cartes Empereur dues (3e puis 6e Prime) avec leur capacité → défausse au-delà de
   10 jetons → vérification de la victoire → tour suivant ou supplémentaire.
5. **Décisions sans option** : une capacité sans effet possible (pas de jeton de la couleur, rien à
   voler, plus de carte Empereur) est ignorée automatiquement.
6. **Paiement automatique** : jetons de la couleur d'abord, Or pour le reste. Dépenser de l'Or à la
   place d'une couleur n'est jamais avantageux (l'Or est un joker et ne peut pas être volé), donc le
   choix est supprimé pour simplifier l'interface.
7. **Victoire** : vérifiée seulement pour le joueur actif à la fin de son tour (l'adversaire ne
   peut pas gagner de points pendant ce tour). Si plusieurs conditions sont remplies, la raison
   affichée suit l'ordre Renommée → Primes → couleur.
8. **Coup « passer » de secours** : si aucune action obligatoire n'est possible et que le plateau ne
   peut pas être rempli (cas pathologique, ex. 3 réserves, plateau ne contenant que de l'Or, sac
   vide), le joueur peut passer pour éviter un blocage. Jamais observé en 200 parties aléatoires.
9. **Cartes réservées depuis la pyramide** : l'adversaire voyait la carte avant la réservation
   (comme autour d'une vraie table) ; le serveur ne publie que le niveau, mais un client attentif
   peut déduire la carte en comparant la pyramide avant/après. C'est inhérent aux règles.
10. **Composition du sac** : déductible (25 − plateau − jetons des joueurs, tous publics), comme
    dans le jeu physique ; seul l'ordre de tirage (graine) est secret.

### Données de cartes

- `cards.json` est un **jeu de données généré et équilibré, non officiel** : 30/24/13 cartes,
  4 cartes Empereur (3 Renommée ; 2 + vol ; 2 + Log Pose ; 2 + rejouer). Environ 16 Renommée par
  couleur, 10 cartes joker, 39 Primes au total, 2 cartes sans bonus et 5 cartes à double bonus
  (niveau 2). À remplacer par la liste exacte si disponible (voir README).
