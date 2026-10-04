/**
 * THÈME — point unique de l'habillage « pirate ». Le moteur ne connaît que des identifiants
 * neutres (white, blue, green, red, black, pearl, gold…) ; tout ce qui est affiché (noms, couleurs,
 * icônes, illustrations) est défini ici et dans `theme.css`.
 *
 * Remplacer une illustration :
 * - ressources : remplacez les SVG de `src/assets/tokens/` (même nom de fichier) ;
 * - cartes : déposez `src/assets/cards/<id>.(webp|png|jpg|svg)` (ex. `L1-07.webp`) ;
 * - cartes Empereur : `src/assets/royals/<id>.(webp|png|jpg|svg)` (ex. `E2.webp`) ;
 * sinon le placeholder (emoji défini dans `cards.json`) est utilisé.
 */
import type {
  AvatarId,
  CardAbility,
  CardKind,
  GemColor,
  RoyalAbility,
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

export const CARD_KINDS: Record<CardKind, string> = {
  crew: 'Équipage',
  ship: 'Navire',
  gear: 'Équipement',
};

export const ABILITIES: Record<
  CardAbility | 'joker',
  { label: string; icon: string; help: string }
> = {
  extraTurn: { label: 'Rejouer', icon: '🔁', help: 'Jouez immédiatement un nouveau tour.' },
  token: {
    label: 'Ravitaillement',
    icon: '➕',
    help: 'Prenez sur le plateau 1 jeton de la couleur du bonus de la carte.',
  },
  privilege: {
    label: 'Log Pose',
    icon: '🧭',
    help: 'Prenez 1 Log Pose (à l’adversaire s’il n’en reste plus).',
  },
  steal: {
    label: 'Abordage',
    icon: '🏴‍☠️',
    help: 'Volez 1 ressource (jamais de Berry) à l’adversaire.',
  },
  joker: {
    label: 'Polyvalent',
    icon: '🃏',
    help: 'Le bonus prend la couleur d’une de vos cartes à bonus (au choix).',
  },
};

export const ROYAL_ABILITIES: Record<RoyalAbility, string> = {
  extraTurn: ABILITIES.extraTurn.help,
  privilege: ABILITIES.privilege.help,
  steal: ABILITIES.steal.help,
};

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
