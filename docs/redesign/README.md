# Refonte visuelle « Pont du navire »

Livrables de la direction artistique retenue (direction A). Les maquettes complètes (accueil, salon, jeu et ses états, fin de partie, profil, en PC 1440 et mobile 390) et la planche du design system sont dans le canevas de design associé.

Rien ici n'est encore branché dans l'application : ce dossier sert de source pour l'intégration.

## Fichiers

| Fichier / dossier       | Contenu                                                                                                                                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.css`            | Variables CSS : couleurs (fonds, surfaces, accents, 7 ressources, niveaux), typographie, espacements, rayons, contours, hauteurs de tranche, mouvement.                                                                                                                |
| `components.css`        | Recette « 3D sans ombre » : `.btn` (primaire, secondaire, danger, fantôme, désactivé, pressé), `.token` (jeton SVG complet + états), `.pip` (pastille sous 26 px), `.card` (cadre bois, bandeau, médaillon), `.panel`, animations et version `prefers-reduced-motion`. |
| `tokens/`               | Les 7 jetons complets (cerclage bois à lattes et rivets, face colorée, picto en relief, épaisseur ; cerclage doré pour le Berry). À utiliser à partir de 26 px.                                                                                                        |
| `icons/resources/`      | Pictogrammes des 7 ressources pour les pastilles (coûts, journal) : sac en toile, carte roulée, trois bûches, bouteille, bombe noire, fruit tacheté, pièce à ancre.                                                                                                    |
| `icons/game/`           | Log Pose, Prime, Renommée, sac, Trésor, bonus polyvalent, roue (logo).                                                                                                                                                                                                 |
| `icons/abilities/`      | Rejouer, Abordage, Ravitaillement, Polyvalent (la capacité Log Pose réutilise `icon-logpose.svg`).                                                                                                                                                                     |
| `icons/ui/`             | Icônes d'interface (menu, journal, règles, copier, partager, valider, fermer, retour, attente, modifier, retirer, voir, profil, revanche, port) et statistiques (parties, défaites, abandons).                                                                         |
| `illustrations/cards/`  | Illustrations de cartes 80 × 64.                                                                                                                                                                                                                                       |
| `illustrations/royals/` | Emblèmes des 4 cartes Empereur.                                                                                                                                                                                                                                        |
| `avatars/`              | Emblèmes de joueur 64 × 64.                                                                                                                                                                                                                                            |

Tous les SVG sont originaux : contour `#2A1A14`, aplats, aucun dégradé, aucun filtre.

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

### Illustrations par famille (`FAMILIES` de `theme.ts`)

| Famille                      | Illustration                                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sword` (Sabre)              | `illo-sabre.svg`                                                                                                                                                                                      |
| `gem` (Ravitailleur)         | `illo-ravitailleur.svg`                                                                                                                                                                               |
| `necklace` (Chaloupe rapide) | `illo-chaloupe.svg`                                                                                                                                                                                   |
| `double` (Navire marchand)   | `illo-marchand.svg`                                                                                                                                                                                   |
| `signet` (Navigateur)        | `illo-navigateur.svg`                                                                                                                                                                                 |
| `glove` (Abordeur)           | `illo-abordeur.svg`                                                                                                                                                                                   |
| `lady` (Galion)              | `illo-galion.svg`                                                                                                                                                                                     |
| `joker` (Matelot polyvalent) | `illo-matelot.svg`                                                                                                                                                                                    |
| `points` (Trésor)            | `illo-coffre.svg` / `illo-bourse.svg` / `illo-trident.svg`                                                                                                                                            |
| Cartes nommées               | `L1-27` Perroquet → `illo-perroquet.svg`, `L3-11` Vaisseau fantôme → `illo-fantome.svg`, `L3-13` Trident → `illo-trident.svg`, `L2-24` Coffre → `illo-coffre.svg`, `L1-30` Bourse → `illo-bourse.svg` |

Il manque encore des illustrations pour Mousse, Pavillon, Officier, Capitaine et quelques cartes nommées (Bouteille à la mer, Mascotte, Timonier, Pavillon noir, Carte déchirée, Vent providentiel). Elles sont à dessiner dans le même style.

### Cartes Empereur

`R-1` → `emb-abysses.svg`, `R-2` → `emb-brumes.svg`, `R-3` → `emb-tempete.svg`, `R-4` → `emb-marees.svg`.

### Avatars (`AVATARS` de `theme.ts`)

`parrot` → `avatar-perroquet`, `octopus` → `avatar-pieuvre`, `shark` → `avatar-requin`, `anchor` → `avatar-ancre`, `compass` → `avatar-boussole`, `skull` → `avatar-crane`, `crab` → `avatar-crabe`, `whale` → `avatar-baleine`, `turtle` → `avatar-tortue`. En attendant des avatars dédiés, `ship`, `map` et `sword` réutilisent `illo-galion`, `glyph-carte` et `illo-sabre`.

## Cartes

Format repris du visuel de référence : cadre en bois, bandeau à la couleur du bonus, fanion des points de Renommée en haut à gauche, médaillon du bonus en haut à droite (avec le picto de la ressource), capacité sous le médaillon, grande illustration sur parchemin, coûts empilés en bas à gauche (chiffre sur la tranche de la ressource + picto). Le nom n'est plus imprimé : il s'affiche au survol, dans la fiche détaillée sur mobile et dans l'`aria-label`.

## Règles du style

- Volume par aplats uniquement : reflet `inset` net, tranche pleine décalée de 2 à 6 px, contour de la tranche. Jamais de flou, de `drop-shadow`, d'ombre portée sur le fond ni de lueur.
- Chaque couleur de ressource est toujours accompagnée de son glyphe, y compris dans les coûts et le journal.
- Joueur actif : bandeau soleil `--color-primary`. Attente : parchemin.
- Zones tactiles d'au moins 44 px. Contrastes du texte conformes WCAG AA (encre sur parchemin 15,2:1, sur soleil 10,4:1, sur corail 5,4:1).
