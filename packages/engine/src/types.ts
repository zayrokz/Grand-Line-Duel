/**
 * Types du domaine. Les identifiants internes reprennent les couleurs du jeu original
 * (white, blue, green, red, black, pearl, gold) pour pouvoir remplacer facilement les données
 * de cartes ; l'habillage pirate (noms, icônes, couleurs affichées) vit dans le thème du client.
 */

export const GEM_COLORS = ['white', 'blue', 'green', 'red', 'black'] as const;
export type GemColor = (typeof GEM_COLORS)[number];

/** Jetons que l'on peut prendre en ligne, avec un Log Pose ou voler : gemmes et perles. */
export type TakeableColor = GemColor | 'pearl';
export const TAKEABLE_COLORS: readonly TakeableColor[] = [...GEM_COLORS, 'pearl'];

export type TokenColor = TakeableColor | 'gold';
export const TOKEN_COLORS: readonly TokenColor[] = [...GEM_COLORS, 'pearl', 'gold'];

export type TokenCounts = Record<TokenColor, number>;

export type Level = 1 | 2 | 3;
export const LEVELS: readonly Level[] = [1, 2, 3];

export type Seat = 0 | 1;

export type CardAbility = 'extraTurn' | 'token' | 'privilege' | 'steal';
export type RoyalAbility = 'extraTurn' | 'privilege' | 'steal';

export type CardKind = 'crew' | 'ship' | 'gear';

/** Coût d'une carte : gemmes et perles (jamais d'Or). */
export type Cost = Partial<Record<TakeableColor, number>>;

export interface CardDef {
  id: string;
  level: Level;
  name: string;
  kind: CardKind;
  /** Placeholder visuel (emoji) ; une image `assets/cards/<id>.*` le remplace côté client. */
  art: string;
  /** Couleur du bonus, `joker` (prend la couleur d'une carte associée) ou `null` (aucun bonus). */
  bonus: GemColor | 'joker' | null;
  bonusCount: number;
  points: number;
  crowns: number;
  ability: CardAbility | null;
  cost: Cost;
}

export interface RoyalDef {
  id: string;
  name: string;
  art: string;
  points: number;
  ability: RoyalAbility | null;
}

/** Carte achetée : `color` est la couleur effective du bonus (joker résolu), `null` sans bonus. */
export interface OwnedCard {
  id: string;
  color: GemColor | null;
}

export interface PlayerState {
  tokens: TokenCounts;
  privileges: number;
  cards: OwnedCard[];
  royals: string[];
  /** Niveaux des cartes réservées (information publique : le dos des cartes). */
  reservedLevels: Level[];
}

/** Décision que le joueur actif doit prendre avant la fin de son tour. */
export type Pending =
  | { kind: 'joker'; cardId: string }
  | { kind: 'token'; color: GemColor }
  | { kind: 'steal' }
  | { kind: 'royal' }
  | { kind: 'discard'; count: number };

export interface TurnFlags {
  usedPrivileges: boolean;
  replenished: boolean;
  extraTurn: boolean;
}

export type WinReason = 'points' | 'crowns' | 'color' | 'resign' | 'timeout';

export type LogEntry =
  | { t: 'start'; first: Seat }
  | { t: 'turn'; p: Seat; extra: boolean }
  | { t: 'privileges'; p: Seat; tokens: TakeableColor[] }
  | { t: 'replenish'; p: Seat; count: number }
  | { t: 'take'; p: Seat; tokens: TakeableColor[] }
  | { t: 'gainPrivilege'; p: Seat; from: 'supply' | 'opponent' }
  | { t: 'reserve'; p: Seat; level: Level; from: 'pyramid' | 'deck' }
  | { t: 'buy'; p: Seat; card: string; paid: Partial<TokenCounts>; fromReserve: boolean }
  | { t: 'joker'; p: Seat; card: string; color: GemColor }
  | { t: 'abilityToken'; p: Seat; color: GemColor }
  | { t: 'steal'; p: Seat; color: TakeableColor }
  | { t: 'royal'; p: Seat; royal: string }
  | { t: 'discard'; p: Seat; tokens: Partial<TokenCounts> }
  | { t: 'pass'; p: Seat }
  | { t: 'end'; winner: Seat; reason: WinReason };

/** Partie visible des deux joueurs (publiée telle quelle dans Firestore). */
export interface PublicState {
  turn: number;
  current: Seat;
  flags: TurnFlags;
  /** File des décisions : la première est celle attendue. Vide = phase principale. */
  pending: Pending[];
  /** 25 cases, ligne par ligne (index = ligne * 5 + colonne). */
  board: (TokenColor | null)[];
  bagCount: number;
  /** Log Pose disponibles au-dessus du plateau. */
  privileges: number;
  pyramid: Record<Level, (string | null)[]>;
  deckCounts: Record<Level, number>;
  royals: string[];
  players: [PlayerState, PlayerState];
  winner: Seat | null;
  winReason: WinReason | null;
  log: LogEntry[];
}

/** Partie cachée : ne quitte jamais le serveur. */
export interface SecretState {
  /** État 32 bits du générateur pseudo-aléatoire. */
  rng: number;
  /** Paquets ordonnés : l'index 0 est la carte du dessus. */
  decks: Record<Level, string[]>;
  bag: TokenColor[];
  /** Cartes réservées par siège (clés "0" et "1" : pas de tableaux imbriqués dans Firestore). */
  reserved: Record<Seat, string[]>;
}

export interface GameState {
  pub: PublicState;
  sec: SecretState;
}

/** Ce qu'un joueur sait : l'état public et ses propres cartes réservées. */
export interface PlayerView {
  pub: PublicState;
  seat: Seat;
  reserved: string[];
}

export type Move =
  | { type: 'usePrivileges'; cells: number[] }
  | { type: 'replenish' }
  | { type: 'takeTokens'; cells: number[] }
  | { type: 'reserve'; goldCell: number; cardId: string }
  | { type: 'reserveDeck'; goldCell: number; level: Level }
  | { type: 'buy'; cardId: string }
  | { type: 'jokerColor'; color: GemColor }
  | { type: 'abilityToken'; cell: number }
  | { type: 'steal'; color: TakeableColor }
  | { type: 'chooseRoyal'; royalId: string }
  | { type: 'discard'; tokens: Partial<TokenCounts> }
  | { type: 'pass' };

export type MoveType = Move['type'];
