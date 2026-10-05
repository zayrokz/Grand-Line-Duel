/**
 * THÈME — point unique de l'habillage « pirate » (direction artistique « Pont du navire »).
 * Le moteur ne connaît que des identifiants neutres (white, blue, green, red, black, pearl,
 * gold…) ; tout ce qui est affiché (noms, couleurs, icônes, illustrations) est défini ici et dans
 * `theme.css`.
 *
 * Remplacer une illustration :
 * - ressources : jetons complets dans `src/assets/tokens/`, pictogrammes dans `src/assets/glyphs/`
 *   (même nom de fichier) ;
 * - cartes : vignettes par famille dans `src/assets/art/` (voir `FAMILIES`, `CARD_NAMES`), ou une
 *   image propre à une carte dans `src/assets/cards/<id>.(webp|png|jpg|svg)` (ex. `L1-07.webp`),
 *   qui est alors prioritaire ;
 * - cartes Empereur : `src/assets/emblems/`, ou `src/assets/royals/<id>.(webp|png|jpg|svg)` ;
 * - avatars : `src/assets/avatars/` ; icônes : `src/assets/icons/`.
 */
import type {
  AvatarId,
  CardAbility,
  CardDef,
  GemColor,
  RoyalDef,
  TokenColor,
  WinReason,
} from '@gld/engine';
import tokenBlack from './assets/tokens/black.svg';
import tokenBlue from './assets/tokens/blue.svg';
import tokenGold from './assets/tokens/gold.svg';
import tokenGreen from './assets/tokens/green.svg';
import tokenPearl from './assets/tokens/pearl.svg';
import tokenRed from './assets/tokens/red.svg';
import tokenWhite from './assets/tokens/white.svg';
import glyphBlack from './assets/glyphs/black.svg';
import glyphBlue from './assets/glyphs/blue.svg';
import glyphGold from './assets/glyphs/gold.svg';
import glyphGreen from './assets/glyphs/green.svg';
import glyphPearl from './assets/glyphs/pearl.svg';
import glyphRed from './assets/glyphs/red.svg';
import glyphWhite from './assets/glyphs/white.svg';
import iconAbordage from './assets/icons/abordage.svg';
import iconAnchor from './assets/icons/anchor.svg';
import iconBack from './assets/icons/back.svg';
import iconBag from './assets/icons/bag.png';
import iconBook from './assets/icons/book.svg';
import iconCheck from './assets/icons/check.svg';
import iconChest from './assets/icons/chest.svg';
import iconClose from './assets/icons/close.svg';
import iconCopy from './assets/icons/copy.svg';
import iconEye from './assets/icons/eye.svg';
import iconHourglass from './assets/icons/hourglass.svg';
import iconJoker from './assets/icons/joker.svg';
import iconLogPose from './assets/icons/logpose.svg';
import iconMenu from './assets/icons/menu.svg';
import iconMinus from './assets/icons/minus.svg';
import iconPencil from './assets/icons/pencil.svg';
import iconPolyvalent from './assets/icons/polyvalent.svg';
import iconPrime from './assets/icons/prime.svg';
import iconRavitaillement from './assets/icons/ravitaillement.svg';
import iconRefresh from './assets/icons/refresh.svg';
import iconRejouer from './assets/icons/rejouer.svg';
import iconScroll from './assets/icons/scroll.svg';
import iconShare from './assets/icons/share.svg';
import iconStar from './assets/icons/star.svg';
import iconStatDuel from './assets/icons/stat-duel.svg';
import iconStatEpave from './assets/icons/stat-epave.svg';
import iconStatFlag from './assets/icons/stat-flag.svg';
import iconUser from './assets/icons/user.svg';
import iconWheel from './assets/icons/wheel.svg';
import artBoussole from './assets/art/art-boussole.webp';
import artCaisse from './assets/art/art-caisse.webp';
import artCarteTresor from './assets/art/art-carte-tresor.webp';
import artCoffre from './assets/art/art-coffre.webp';
import artCorde from './assets/art/art-corde.webp';
import artDrapeauBlanc from './assets/art/art-drapeau-blanc.webp';
import artDrapeauBleu from './assets/art/art-drapeau-bleu.webp';
import artDrapeauNoir from './assets/art/art-drapeau-noir.webp';
import artDrapeauRaye from './assets/art/art-drapeau-raye.webp';
import artDrapeauRouge from './assets/art/art-drapeau-rouge.webp';
import artDrapeauVert from './assets/art/art-drapeau-vert.webp';
import artEmeraudes from './assets/art/art-emeraudes.webp';
import artGouvernail from './assets/art/art-gouvernail.webp';
import artIle from './assets/art/art-ile.webp';
import artLongueVue from './assets/art/art-longue-vue.webp';
import artMariniere from './assets/art/art-mariniere.webp';
import artNavireFantome from './assets/art/art-navire-fantome.webp';
import artNavire from './assets/art/art-navire.webp';
import artPerroquet from './assets/art/art-perroquet.webp';
import artPistolet from './assets/art/art-pistolet.webp';
import artRhum from './assets/art/art-rhum.webp';
import artSabre from './assets/art/art-sabre.webp';
import artSextant from './assets/art/art-sextant.webp';
import artSinge from './assets/art/art-singe.webp';
import artTonneau from './assets/art/art-tonneau.webp';
import artTrident from './assets/art/art-trident.webp';
import artVoile from './assets/art/art-voile.webp';
import emblemAbysses from './assets/emblems/abysses.svg';
import emblemBrumes from './assets/emblems/brumes.svg';
import emblemMarees from './assets/emblems/marees.svg';
import emblemTempete from './assets/emblems/tempete.svg';
import avatarAncre from './assets/avatars/ancre.svg';
import avatarBaleine from './assets/avatars/baleine.svg';
import avatarBoussole from './assets/avatars/boussole.svg';
import avatarCrabe from './assets/avatars/crabe.svg';
import avatarCrane from './assets/avatars/crane.svg';
import avatarPerroquet from './assets/avatars/perroquet.svg';
import avatarPieuvre from './assets/avatars/pieuvre.svg';
import avatarRequin from './assets/avatars/requin.svg';
import avatarTortue from './assets/avatars/tortue.svg';
import sceneChaloupe from './assets/scenes/chaloupe.svg';
import sceneCoffre from './assets/scenes/coffre.svg';
import sceneGalion from './assets/scenes/galion.svg';
import sceneNavigateur from './assets/scenes/navigateur.svg';
import sceneSabre from './assets/scenes/sabre.svg';

export const GAME_TITLE = 'Grand Line Duel';
export const GAME_TAGLINE = 'Soyez le premier pirate à mettre la main sur le trésor légendaire.';

export interface ResourceTheme {
  /** Nom affiché (singulier). */
  name: string;
  /** Nom au pluriel. */
  plural: string;
  /** Face (couleur principale). */
  color: string;
  /** Tranche (couleur plus sombre, aussi utilisée pour les chiffres de coût). */
  edge: string;
  /** Face claire : le texte posé dessus est en encre plutôt qu'en crème. */
  light: boolean;
  /** Jeton complet (à partir de 26 px). */
  token: string;
  /** Pictogramme seul, posé sur une pastille de la couleur (moins de 26 px). */
  glyph: string;
}

export const RESOURCES: Record<TokenColor, ResourceTheme> = {
  white: {
    name: 'Provisions',
    plural: 'Provisions',
    color: '#f4e7c9',
    edge: '#c9ae7c',
    light: true,
    token: tokenWhite,
    glyph: glyphWhite,
  },
  blue: {
    name: 'Carte marine',
    plural: 'Cartes marines',
    color: '#3c82c8',
    edge: '#255c94',
    light: false,
    token: tokenBlue,
    glyph: glyphBlue,
  },
  green: {
    name: 'Bois',
    plural: 'Bois',
    color: '#3f9b4f',
    edge: '#286e36',
    light: false,
    token: tokenGreen,
    glyph: glyphGreen,
  },
  red: {
    name: 'Rhum',
    plural: 'Rhum',
    color: '#e35d45',
    edge: '#a9392a',
    light: false,
    token: tokenRed,
    glyph: glyphRed,
  },
  black: {
    name: 'Poudre à canon',
    plural: 'Poudre à canon',
    color: '#3b3533',
    edge: '#191514',
    light: false,
    token: tokenBlack,
    glyph: glyphBlack,
  },
  pearl: {
    name: 'Fruit du Démon',
    plural: 'Fruits du Démon',
    color: '#9563d0',
    edge: '#663c9c',
    light: false,
    token: tokenPearl,
    glyph: glyphPearl,
  },
  gold: {
    name: 'Berry',
    plural: 'Berrys',
    color: '#f5be38',
    edge: '#b98512',
    light: true,
    token: tokenGold,
    glyph: glyphGold,
  },
};

/** Bandeau rayé des cartes polyvalentes (les cinq couleurs de bonus). */
export const JOKER_THEME = {
  name: 'Bonus polyvalent',
  band: 'repeating-linear-gradient(135deg, #f4e7c9 0 7px, #3c82c8 7px 14px, #3f9b4f 14px 21px, #e35d45 21px 28px, #3b3533 28px 35px)',
  ribbon: '#3b3533',
};
/** Cartes sans bonus : bandeau « bois flotté ». */
export const NO_BONUS_THEME = { band: '#c9b596', ribbon: '#7a6648' };

/** Vocabulaire du jeu (équivalences avec le jeu original en commentaire). */
export const TERMS = {
  privilege: 'Log Pose', // Privilège
  privileges: 'Log Pose',
  points: 'Renommée', // Points de Prestige
  crown: 'Prime', // Couronne
  crowns: 'Primes',
  royal: 'carte Empereur', // carte Royale
  royals: 'cartes Empereur',
  victoryCard: 'Le Trésor', // carte Victoire
  bag: 'sac',
  board: 'plateau',
  pyramid: 'pyramide',
};

export const ICONS = {
  privilege: iconLogPose,
  crown: iconPrime,
  points: iconStar,
  treasure: iconChest,
  joker: iconJoker,
  logo: iconWheel,
  /** Sac (pioche) : sac de toile avec une pioche, distinct du sac des Provisions. */
  bag: iconBag,
};

/** Icônes d'interface. */
export const UI_ICONS = {
  menu: iconMenu,
  log: iconScroll,
  rules: iconBook,
  copy: iconCopy,
  share: iconShare,
  check: iconCheck,
  close: iconClose,
  back: iconBack,
  wait: iconHourglass,
  edit: iconPencil,
  minus: iconMinus,
  eye: iconEye,
  profile: iconUser,
  rematch: iconRefresh,
  port: iconAnchor,
  played: iconStatDuel,
  losses: iconStatEpave,
  abandons: iconStatFlag,
};

/** Illustrations de décor (accueil, salon, fin de partie). */
export const SCENES = {
  galleon: sceneGalion,
  rowboat: sceneChaloupe,
  navigator: sceneNavigateur,
  chest: sceneCoffre,
  storm: emblemTempete,
};

export type CardKind = 'crew' | 'ship' | 'gear';

export const CARD_KINDS: Record<CardKind, string> = {
  crew: 'Équipage',
  ship: 'Navire',
  gear: 'Équipement',
};

/** Habillage des capacités (identifiants du fichier de données). */
export const ABILITIES: Record<CardAbility, { label: string; icon: string; help: string }> = {
  extra_turn: {
    label: 'Rejouer',
    icon: iconRejouer,
    help: 'Jouez immédiatement un nouveau tour.',
  },
  associate: {
    label: 'Polyvalent',
    icon: iconPolyvalent,
    help: 'Le bonus prend la couleur d’une de vos cartes à bonus (au choix).',
  },
  take_token: {
    label: 'Ravitaillement',
    icon: iconRavitaillement,
    help: 'Prenez sur le plateau 1 jeton de la couleur du bonus de la carte.',
  },
  take_privilege: {
    label: 'Log Pose',
    icon: iconLogPose,
    help: 'Prenez 1 Log Pose (à l’adversaire s’il n’en reste plus).',
  },
  steal_token: {
    label: 'Abordage',
    icon: iconAbordage,
    help: 'Volez 1 ressource (jamais de Berry) à l’adversaire.',
  },
};

/**
 * Habillage des familles de cartes (champ `family` de data/cards.json). Les données de jeu ne
 * contiennent ni nom ni illustration : tout l'habillage est ici. `art` est la vignette
 * (parchemin 180 × 216) affichée en plein cadre sous le bandeau.
 */
export const FAMILIES: Record<string, { name: string; kind: CardKind; art: string }> = {
  earring: { name: 'Mousse', kind: 'crew', art: artCorde },
  sword: { name: 'Sabre', kind: 'gear', art: artSabre },
  diadem: { name: 'Pavillon', kind: 'gear', art: artDrapeauNoir },
  gem: { name: 'Ravitailleur', kind: 'crew', art: artTonneau },
  necklace: { name: 'Chaloupe rapide', kind: 'ship', art: artVoile },
  double: { name: 'Navire marchand', kind: 'ship', art: artCaisse },
  signet: { name: 'Navigateur', kind: 'crew', art: artSextant },
  glove: { name: 'Abordeur', kind: 'crew', art: artPistolet },
  tiara: { name: 'Officier', kind: 'crew', art: artBoussole },
  crown: { name: 'Capitaine', kind: 'crew', art: artLongueVue },
  lady: { name: 'Galion', kind: 'ship', art: artNavire },
  joker: { name: 'Matelot polyvalent', kind: 'crew', art: artMariniere },
  points: { name: 'Trésor', kind: 'gear', art: artCoffre },
};

/** Les Pavillons arborent le drapeau de la couleur de leur bonus. */
const PAVILLON_ART: Record<GemColor, string> = {
  white: artDrapeauBlanc,
  blue: artDrapeauBleu,
  green: artDrapeauVert,
  red: artDrapeauRaye,
  black: artDrapeauNoir,
};

/** Complément de nom selon la couleur du bonus (« Sabre de la taverne »). */
export const COLOR_EPITHETS: Record<GemColor, string> = {
  white: 'de la cambuse',
  blue: 'des cartographes',
  green: 'du chantier naval',
  red: 'de la taverne',
  black: 'de la sainte-barbe',
};

/** Noms propres des cartes sans couleur fixe (jokers, trésors), par identifiant. */
export const CARD_NAMES: Record<string, { name: string; art?: string; kind?: CardKind }> = {
  'L1-26': { name: 'Matelot polyvalent', art: artMariniere },
  'L1-27': { name: 'Perroquet bavard', art: artPerroquet },
  'L1-28': { name: 'Bouteille à la mer', art: artRhum, kind: 'gear' },
  'L1-29': { name: 'Mascotte du navire', art: artSinge },
  'L1-30': { name: 'Bourse de doublons', art: artEmeraudes, kind: 'gear' },
  'L2-21': { name: 'Timonier aguerri', art: artGouvernail },
  'L2-22': { name: 'Pavillon noir', art: artDrapeauRouge, kind: 'gear' },
  'L2-23': { name: 'Carte au trésor déchirée', art: artCarteTresor, kind: 'gear' },
  'L2-24': { name: 'Coffre au trésor', art: artCoffre, kind: 'gear' },
  'L3-11': { name: 'Vaisseau fantôme', art: artNavireFantome, kind: 'ship' },
  'L3-12': { name: 'Vent providentiel', art: artIle, kind: 'gear' },
  'L3-13': { name: 'Trident des tempêtes', art: artTrident, kind: 'gear' },
};

/** Nom, type et illustration d'une carte. */
export function cardTheme(card: CardDef): { name: string; kind: CardKind; art: string } {
  const family = FAMILIES[card.family] ?? { name: 'Carte', kind: 'gear', art: artCoffre };
  const named = CARD_NAMES[card.id];
  const colored = card.bonus !== null && card.bonus !== 'joker';
  const name =
    named?.name ??
    (colored
      ? `${family.name} ${COLOR_EPITHETS[card.bonus as GemColor]}`
      : `${family.name} (${card.id})`);
  const art =
    named?.art ??
    (card.family === 'diadem' && colored ? PAVILLON_ART[card.bonus as GemColor] : family.art);
  return { name, kind: named?.kind ?? family.kind, art };
}

/** Habillage des cartes Royales (« cartes Empereur »), par identifiant. */
export const ROYAL_THEME: Record<string, { name: string; art: string }> = {
  'R-1': { name: 'Impératrice des Abysses', art: emblemAbysses },
  'R-2': { name: 'Empereur des Brumes', art: emblemBrumes },
  'R-3': { name: 'Empereur de la Tempête', art: emblemTempete },
  'R-4': { name: 'Impératrice des Marées', art: emblemMarees },
};

export function royalTheme(royal: RoyalDef): { name: string; art: string } {
  return ROYAL_THEME[royal.id] ?? { name: `Empereur ${royal.id}`, art: iconChest };
}

/** Dos de carte : couleur de chaque niveau (rayures) et sa tranche. */
export const LEVEL_THEME: Record<
  1 | 2 | 3,
  { name: string; roman: string; color: string; edge: string }
> = {
  1: { name: 'Mers calmes', roman: 'I', color: '#2e9c8a', edge: '#1c6b5e' },
  2: { name: 'Grand Large', roman: 'II', color: '#e59a2f', edge: '#a86a14' },
  3: { name: 'Mers légendaires', roman: 'III', color: '#b23a48', edge: '#74202c' },
};

/** Emblèmes de joueur : image et fond de la pastille. */
export const AVATARS: Record<AvatarId, { image: string; label: string; bg: string }> = {
  parrot: { image: avatarPerroquet, label: 'Perroquet', bg: '#ffe1a6' },
  octopus: { image: avatarPieuvre, label: 'Pieuvre', bg: '#f3d3ee' },
  shark: { image: avatarRequin, label: 'Requin', bg: '#cfe0e8' },
  anchor: { image: avatarAncre, label: 'Ancre', bg: '#dce8f0' },
  compass: { image: avatarBoussole, label: 'Boussole', bg: '#fbe7c6' },
  skull: { image: avatarCrane, label: 'Crâne', bg: '#f6d0c7' },
  crab: { image: avatarCrabe, label: 'Crabe', bg: '#ffe0c9' },
  whale: { image: avatarBaleine, label: 'Baleine', bg: '#d6e6f2' },
  ship: { image: sceneGalion, label: 'Voilier', bg: '#d7f0ec' },
  map: { image: glyphBlue, label: 'Carte', bg: '#cfe3f5' },
  sword: { image: sceneSabre, label: 'Sabre', bg: '#e9e6ef' },
  turtle: { image: avatarTortue, label: 'Tortue', bg: '#ddf0d5' },
};

const UNKNOWN_AVATAR = { image: avatarCrane, label: 'Pirate', bg: '#f6d0c7' };

export function avatarTheme(id: string): { image: string; label: string; bg: string } {
  return (
    (AVATARS as Record<string, { image: string; label: string; bg: string }>)[id] ?? UNKNOWN_AVATAR
  );
}

export const WIN_REASONS: Record<WinReason | 'expired', string> = {
  points: '20 points de Renommée',
  crowns: '10 Primes',
  color: '10 points de Renommée dans une même couleur',
  resign: 'abandon de l’adversaire',
  timeout: 'délai de jeu dépassé par l’adversaire',
  expired: 'salon fermé',
};

/** Bandeau et fanion d'une carte selon son bonus. */
export function bonusTheme(bonus: GemColor | 'joker' | null): {
  band: string;
  ribbon: string;
  /** Couleur du chiffre posé sur le fanion. */
  ribbonInk: string;
} {
  if (bonus === null) return { ...NO_BONUS_THEME, ribbonInk: 'var(--color-on-dark)' };
  if (bonus === 'joker') {
    return {
      band: JOKER_THEME.band,
      ribbon: JOKER_THEME.ribbon,
      ribbonInk: 'var(--color-on-dark)',
    };
  }
  const res = RESOURCES[bonus];
  return {
    band: res.color,
    ribbon: res.edge,
    ribbonInk: res.light ? 'var(--color-ink)' : 'var(--color-on-dark)',
  };
}

const imageModules = import.meta.glob<string>('./assets/{cards,royals}/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
});

/** Image propre à une carte (ou carte Empereur) si elle est fournie, sinon `null`. */
export function cardImage(id: string): string | null {
  for (const [path, url] of Object.entries(imageModules)) {
    const file = path.split('/').pop() ?? '';
    if (file.replace(/\.[^.]+$/, '') === id) return url;
  }
  return null;
}
