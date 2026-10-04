/**
 * THÈME — point unique de l'habillage « pirate ». Le moteur ne connaît que des identifiants
 * neutres (white, blue, green, red, black, pearl, gold…) ; tout ce qui est affiché (noms, couleurs,
 * icônes, illustrations) est défini ici et dans `theme.css`.
 *
 * Remplacer une illustration :
 * - ressources : remplacez les SVG de `src/assets/tokens/` (même nom de fichier) ;
 * - cartes : déposez `src/assets/cards/<id>.(webp|png|jpg|svg)` (ex. `L1-07.webp`) ;
 * - cartes Empereur : `src/assets/royals/<id>.(webp|png|jpg|svg)` (ex. `R-2.webp`) ;
 * sinon le placeholder (emoji défini ci-dessous par famille ou par carte) est utilisé.
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
import blackIcon from './assets/tokens/black.svg';
import blueIcon from './assets/tokens/blue.svg';
import goldIcon from './assets/tokens/gold.svg';
import greenIcon from './assets/tokens/green.svg';
import pearlIcon from './assets/tokens/pearl.svg';
import redIcon from './assets/tokens/red.svg';
import whiteIcon from './assets/tokens/white.svg';
import cardBack from './assets/card-back.svg';
import logPoseIcon from './assets/logpose.svg';
import logo from './assets/logo.svg';
import primeIcon from './assets/prime.svg';
import treasureIcon from './assets/treasure.svg';

export const GAME_TITLE = 'Grand Line Duel';
export const GAME_TAGLINE = 'Soyez le premier pirate à mettre la main sur le trésor légendaire.';

export interface ResourceTheme {
  /** Nom affiché (singulier). */
  name: string;
  /** Nom au pluriel. */
  plural: string;
  /** Couleur principale (CSS). */
  color: string;
  /** Couleur de texte lisible sur `color`. */
  ink: string;
  icon: string;
}

export const RESOURCES: Record<TokenColor, ResourceTheme> = {
  white: {
    name: 'Provisions',
    plural: 'Provisions',
    color: '#e8dcbc',
    ink: '#3b2e14',
    icon: whiteIcon,
  },
  blue: {
    name: 'Carte marine',
    plural: 'Cartes marines',
    color: '#2f6fb3',
    ink: '#ffffff',
    icon: blueIcon,
  },
  green: { name: 'Bois', plural: 'Bois', color: '#3f8a4a', ink: '#ffffff', icon: greenIcon },
  red: { name: 'Rhum', plural: 'Rhum', color: '#b5352b', ink: '#ffffff', icon: redIcon },
  black: {
    name: 'Poudre à canon',
    plural: 'Poudre à canon',
    color: '#2b2b33',
    ink: '#ffffff',
    icon: blackIcon,
  },
  pearl: {
    name: 'Fruit du Démon',
    plural: 'Fruits du Démon',
    color: '#9b4fb0',
    ink: '#ffffff',
    icon: pearlIcon,
  },
  gold: { name: 'Berry', plural: 'Berrys', color: '#e0b43a', ink: '#3b2e14', icon: goldIcon },
};

export const JOKER_THEME = {
  name: 'Bonus joker',
  color: 'linear-gradient(135deg, #e8dcbc, #2f6fb3, #3f8a4a, #b5352b, #2b2b33)',
};
export const NO_BONUS_COLOR = '#7b8794';

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
  privilege: logPoseIcon,
  crown: primeIcon,
  treasure: treasureIcon,
  logo,
  cardBack,
};

export type CardKind = 'crew' | 'ship' | 'gear';

export const CARD_KINDS: Record<CardKind, string> = {
  crew: 'Équipage',
  ship: 'Navire',
  gear: 'Équipement',
};

/** Habillage des capacités (identifiants du fichier de données). */
export const ABILITIES: Record<CardAbility, { label: string; icon: string; help: string }> = {
  extra_turn: { label: 'Rejouer', icon: '🔁', help: 'Jouez immédiatement un nouveau tour.' },
  associate: {
    label: 'Polyvalent',
    icon: '🃏',
    help: 'Le bonus prend la couleur d’une de vos cartes à bonus (au choix).',
  },
  take_token: {
    label: 'Ravitaillement',
    icon: '➕',
    help: 'Prenez sur le plateau 1 jeton de la couleur du bonus de la carte.',
  },
  take_privilege: {
    label: 'Log Pose',
    icon: '🧭',
    help: 'Prenez 1 Log Pose (à l’adversaire s’il n’en reste plus).',
  },
  steal_token: {
    label: 'Abordage',
    icon: '🏴‍☠️',
    help: 'Volez 1 ressource (jamais de Berry) à l’adversaire.',
  },
};

/**
 * Habillage des familles de cartes (champ `family` de data/cards.json). Les données de jeu ne
 * contiennent ni nom ni illustration : tout l'habillage est ici.
 */
export const FAMILIES: Record<string, { name: string; kind: CardKind; art: string }> = {
  earring: { name: 'Mousse', kind: 'crew', art: '🧒' },
  sword: { name: 'Sabre', kind: 'gear', art: '🗡️' },
  diadem: { name: 'Pavillon', kind: 'gear', art: '🚩' },
  gem: { name: 'Ravitailleur', kind: 'crew', art: '🧺' },
  necklace: { name: 'Chaloupe rapide', kind: 'ship', art: '🚣' },
  double: { name: 'Navire marchand', kind: 'ship', art: '🚢' },
  signet: { name: 'Navigateur', kind: 'crew', art: '🧭' },
  glove: { name: 'Abordeur', kind: 'crew', art: '🪝' },
  tiara: { name: 'Officier', kind: 'crew', art: '🎖️' },
  crown: { name: 'Capitaine', kind: 'crew', art: '🎩' },
  lady: { name: 'Galion', kind: 'ship', art: '🛳️' },
  joker: { name: 'Matelot polyvalent', kind: 'crew', art: '🃏' },
  points: { name: 'Trésor', kind: 'gear', art: '💰' },
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
  'L1-26': { name: 'Matelot polyvalent', art: '🧑‍🔧' },
  'L1-27': { name: 'Perroquet bavard', art: '🦜' },
  'L1-28': { name: 'Bouteille à la mer', art: '🍾', kind: 'gear' },
  'L1-29': { name: 'Mascotte du navire', art: '🐒' },
  'L1-30': { name: 'Bourse de doublons', art: '💰', kind: 'gear' },
  'L2-21': { name: 'Timonier aguerri', art: '☸️' },
  'L2-22': { name: 'Pavillon noir', art: '🏴‍☠️', kind: 'gear' },
  'L2-23': { name: 'Carte au trésor déchirée', art: '🗺️', kind: 'gear' },
  'L2-24': { name: 'Coffre au trésor', art: '🧰', kind: 'gear' },
  'L3-11': { name: 'Vaisseau fantôme', art: '👻', kind: 'ship' },
  'L3-12': { name: 'Vent providentiel', art: '🌬️', kind: 'gear' },
  'L3-13': { name: 'Trident des tempêtes', art: '🔱', kind: 'gear' },
};

/** Nom, type et illustration (placeholder) d'une carte. */
export function cardTheme(card: CardDef): { name: string; kind: CardKind; art: string } {
  const family = FAMILIES[card.family] ?? { name: 'Carte', kind: 'gear', art: '🏴‍☠️' };
  const named = CARD_NAMES[card.id];
  const colored = card.bonus !== null && card.bonus !== 'joker';
  const name =
    named?.name ??
    (colored
      ? `${family.name} ${COLOR_EPITHETS[card.bonus as GemColor]}`
      : `${family.name} (${card.id})`);
  return { name, kind: named?.kind ?? family.kind, art: named?.art ?? family.art };
}

/** Habillage des cartes Royales (« cartes Empereur »), par identifiant. */
export const ROYAL_THEME: Record<string, { name: string; art: string }> = {
  'R-1': { name: 'Impératrice des Abysses', art: '🐙' },
  'R-2': { name: 'Empereur des Brumes', art: '🌫️' },
  'R-3': { name: 'Empereur de la Tempête', art: '🌪️' },
  'R-4': { name: 'Impératrice des Marées', art: '🌊' },
};

export function royalTheme(royal: RoyalDef): { name: string; art: string } {
  return ROYAL_THEME[royal.id] ?? { name: `Empereur ${royal.id}`, art: '👑' };
}

export const LEVEL_THEME: Record<1 | 2 | 3, { name: string; color: string }> = {
  1: { name: 'Mers calmes', color: '#3f8a4a' },
  2: { name: 'Grand Large', color: '#c98a1c' },
  3: { name: 'Mers légendaires', color: '#2f6fb3' },
};

export const AVATARS: Record<AvatarId, { emoji: string; label: string }> = {
  parrot: { emoji: '🦜', label: 'Perroquet' },
  octopus: { emoji: '🐙', label: 'Pieuvre' },
  shark: { emoji: '🦈', label: 'Requin' },
  anchor: { emoji: '⚓', label: 'Ancre' },
  compass: { emoji: '🧭', label: 'Boussole' },
  skull: { emoji: '💀', label: 'Crâne' },
  crab: { emoji: '🦀', label: 'Crabe' },
  whale: { emoji: '🐋', label: 'Baleine' },
  ship: { emoji: '⛵', label: 'Voilier' },
  map: { emoji: '🗺️', label: 'Carte' },
  sword: { emoji: '🗡️', label: 'Sabre' },
  turtle: { emoji: '🐢', label: 'Tortue' },
};

export function avatarEmoji(id: string): string {
  return (AVATARS as Record<string, { emoji: string }>)[id]?.emoji ?? '🏴‍☠️';
}

export const WIN_REASONS: Record<WinReason | 'expired', string> = {
  points: '20 points de Renommée',
  crowns: '10 Primes',
  color: '10 points de Renommée dans une même couleur',
  resign: 'abandon de l’adversaire',
  timeout: 'délai de jeu dépassé par l’adversaire',
  expired: 'salon fermé',
};

/** Couleur d'affichage du bonus d'une carte. */
export function bonusColor(bonus: GemColor | 'joker' | null): string {
  if (bonus === null) return NO_BONUS_COLOR;
  if (bonus === 'joker') return JOKER_THEME.color;
  return RESOURCES[bonus].color;
}

const imageModules = import.meta.glob<string>('./assets/{cards,royals}/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
});

/** Illustration d'une carte (ou carte Empereur) si une image est fournie, sinon `null`. */
export function cardImage(id: string): string | null {
  for (const [path, url] of Object.entries(imageModules)) {
    const file = path.split('/').pop() ?? '';
    if (file.replace(/\.[^.]+$/, '') === id) return url;
  }
  return null;
}
