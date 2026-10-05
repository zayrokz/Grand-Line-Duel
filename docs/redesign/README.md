# Refonte visuelle « Pont du navire »

Livrables de la direction artistique retenue (direction A). Les maquettes complètes (accueil, salon, jeu et ses états, fin de partie, profil, en PC 1440 et mobile 390) et la planche du design system sont dans le canevas de design associé.

La direction est intégrée dans l'application (`packages/web`) : variables dans `src/theme.css`, styles dans `src/styles.css`, images dans `src/assets/` et habillage (noms, couleurs, vignettes par carte) dans `src/theme.ts`. Ce dossier reste la source de référence des fichiers d'origine.

## Fichiers

| Fichier / dossier       | Contenu                                                                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`            | Variables CSS : couleurs (fonds, surfaces, accents, 7 ressources, niveaux), typographie, espacements, rayons, contours, hauteurs de tranche, mouvement.                                                                                                                |
| `components.css`        | Recette « 3D sans ombre » : `.btn` (primaire, secondaire, danger, fantôme, désactivé, pressé), `.token` (jeton SVG complet + états), `.pip` (pastille sous 26 px), `.card` (cadre bois, bandeau, médaillon), `.panel`, animations et version `prefers-reduced-motion`. |
| `tokens/`               | Les 7 jetons complets (cerclage bois à lattes et rivets, face colorée, picto en relief, épaisseur ; cerclage doré pour le Berry). À utiliser à partir de 26 px.                                                                                                        |
| `icons/resources/`      | Pictogrammes des 7 ressources pour les pastilles (coûts, journal) : sac en toile, carte roulée, trois bûches, bouteille, bombe noire, fruit tacheté, pièce à ancre.                                                                                                    |
| `icons/game/`           | Log Pose, Prime, Renommée, sac de pioche (`icon-bag.png`, sac avec une pioche, fond transparent), Trésor, bonus polyvalent, roue (logo).                                                                                                                               |
| `icons/abilities/`      | Rejouer, Abordage, Ravitaillement, Polyvalent (la capacité Log Pose réutilise `icon-logpose.svg`).                                                                                                                                                                     |
| `icons/ui/`             | Icônes d'interface (menu, journal, règles, copier, partager, valider, fermer, retour, attente, modifier, retirer, voir, profil, revanche, port) et statistiques (parties, défaites, abandons).                                                                         |
| `illustrations/cards/`  | Illustrations des cartes : vignettes peintes sur parchemin, 180 × 216, WebP (`art-<sujet>.webp`).                                                                                                                                                                      |
| `illustrations/scenes/` | Illustrations vectorielles hors cartes : accueil (galion, chaloupe, navigateur), salon (chaloupe), victoire (coffre), avatars provisoires (galion, sabre).                                                                                                             |
| `illustrations/royals/` | Emblèmes des 4 cartes Empereur.                                                                                                                                                                                                                                        |
| `avatars/`              | Emblèmes de joueur 64 × 64.                                                                                                                                                                                                                                            |

Tous les SVG sont originaux : contour `#2A1A14`, aplats, aucun dégradé, aucun filtre. Les vignettes de cartes viennent de la planche d'illustrations fournie par le porteur du projet.

## Intégration

1. Polices : charger `Lilita One` (titres, chiffres) et `Nunito` 700/800/900 (texte).
2. Importer `tokens.css` puis `components.css` dans `main.tsx`.
3. Fond de page : `background: var(--color-bg-wood) var(--bg-deck);`.

### Ressources (moteur → client)

| Moteur  | `data-res`   | Glyphe                 |
| ------- | ------------ | ---------------------- |
| `white` | `provisions` | `glyph-provisions.svg` |
| `blue`  | `carte`      | `glyph-carte.svg`      |
| `green` | `bois`       | `glyph-bois.svg`       |
| `red`   | `rhum`       | `glyph-rhum.svg`       |
| `black` | `poudre`     | `glyph-poudre.svg`     |
| `pearl` | `fruit`      | `glyph-fruit.svg`      |
| `gold`  | `or`         | `glyph-berry.svg`      |

### Capacités

| Moteur           | Icône                                                           |
| ---------------- | --------------------------------------------------------------- |
| `extra_turn`     | `icon-rejouer.svg`                                              |
| `steal_token`    | `icon-abordage.svg`                                             |
| `take_token`     | `icon-ravitaillement.svg`                                       |
| `take_privilege` | `icon-logpose.svg`                                              |
| `associate`      | `icon-polyvalent.svg` (le bonus joker utilise `icon-joker.svg`) |

### Illustrations des cartes

L'app cherche `src/assets/cards/<id>.webp` (voir `theme.ts`). Copier la vignette de la famille sous l'identifiant de chaque carte, ou faire pointer `FAMILIES` / `CARD_NAMES` vers ces fichiers.

| Famille (`FAMILIES`)         | Vignette                                |
| ---------------------------- | --------------------------------------- |
| `earring` (Mousse)           | `art-corde.webp`                        |
| `sword` (Sabre)              | `art-sabre.webp`                        |
| `gem` (Ravitailleur)         | `art-tonneau.webp`                      |
| `necklace` (Chaloupe rapide) | `art-voile.webp`                        |
| `double` (Navire marchand)   | `art-caisse.webp`                       |
| `signet` (Navigateur)        | `art-sextant.webp`                      |
| `glove` (Abordeur)           | `art-pistolet.webp`                     |
| `tiara` (Officier)           | `art-boussole.webp`                     |
| `crown` (Capitaine)          | `art-longue-vue.webp`                   |
| `lady` (Galion)              | `art-navire.webp`                       |
| `joker` (Matelot polyvalent) | `art-mariniere.webp`                    |
| `points` (Trésor)            | `art-coffre.webp`                       |
| `diadem` (Pavillon)          | un drapeau par couleur, voir ci-dessous |

| Pavillon (`diadem`)               | Vignette                 |
| --------------------------------- | ------------------------ |
| `L1-11` de la cambuse (blanc)     | `art-drapeau-blanc.webp` |
| `L1-12` des cartographes (bleu)   | `art-drapeau-bleu.webp`  |
| `L1-13` du chantier naval (vert)  | `art-drapeau-vert.webp`  |
| `L1-14` de la taverne (rouge)     | `art-drapeau-raye.webp`  |
| `L1-15` de la sainte-barbe (noir) | `art-drapeau-noir.webp`  |

| Carte nommée (`CARD_NAMES`)      | Vignette                  |
| -------------------------------- | ------------------------- |
| `L1-26` Matelot polyvalent       | `art-mariniere.webp`      |
| `L1-27` Perroquet bavard         | `art-perroquet.webp`      |
| `L1-28` Bouteille à la mer       | `art-rhum.webp`           |
| `L1-29` Mascotte du navire       | `art-singe.webp`          |
| `L1-30` Bourse de doublons       | `art-emeraudes.webp`      |
| `L2-21` Timonier aguerri         | `art-gouvernail.webp`     |
| `L2-22` Pavillon noir            | `art-drapeau-rouge.webp`  |
| `L2-23` Carte au trésor déchirée | `art-carte-tresor.webp`   |
| `L2-24` Coffre au trésor         | `art-coffre.webp`         |
| `L3-11` Vaisseau fantôme         | `art-navire-fantome.webp` |
| `L3-12` Vent providentiel        | `art-ile.webp`            |
| `L3-13` Trident des tempêtes     | `art-trident.webp`        |

Toutes les cartes ont leur vignette. `drapeaux/` garde trois drapeaux de réserve (noir pommeau argent, blanc liseré rouge, noir bordé d'or) qui ne sont attribués à aucune carte.

### Cartes Empereur

`R-1` → `emb-abysses.svg`, `R-2` → `emb-brumes.svg`, `R-3` → `emb-tempete.svg`, `R-4` → `emb-marees.svg`.

### Avatars (`AVATARS` de `theme.ts`)

`parrot` → `avatar-perroquet`, `octopus` → `avatar-pieuvre`, `shark` → `avatar-requin`, `anchor` → `avatar-ancre`, `compass` → `avatar-boussole`, `skull` → `avatar-crane`, `crab` → `avatar-crabe`, `whale` → `avatar-baleine`, `turtle` → `avatar-tortue`. En attendant des avatars dédiés, `ship`, `map` et `sword` réutilisent `scenes/illo-galion`, `glyph-carte` et `scenes/illo-sabre`.

## Cartes

Format repris du visuel de référence : cadre en bois, bandeau à la couleur du bonus, fanion des points de Renommée en haut à gauche, médaillon du bonus en haut à droite (avec le picto de la ressource), capacité sous le médaillon, vignette parchemin en plein cadre sous le bandeau (`.card__art`, `object-fit: cover`), coûts empilés en bas à gauche (chiffre sur la tranche de la ressource + picto). Le nom n'est plus imprimé : il s'affiche au survol, dans la fiche détaillée sur mobile et dans l'`aria-label`.

## Règles du style

- Volume par aplats uniquement : reflet `inset` net, tranche pleine décalée de 2 à 6 px, contour de la tranche. Jamais de flou, de `drop-shadow`, d'ombre portée sur le fond ni de lueur.
- Chaque couleur de ressource est toujours accompagnée de son glyphe, y compris dans les coûts et le journal.
- Joueur actif : bandeau soleil `--color-primary`. Attente : parchemin.
- Zones tactiles d'au moins 44 px. Contrastes du texte conformes WCAG AA (encre sur parchemin 15,2:1, sur soleil 10,4:1, sur corail 5,4:1).
