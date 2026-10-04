import { getCard, getRoyal, isJoker, RULES } from './cards.js';
import { GEM_COLORS, TOKEN_COLORS } from './types.js';
import type {
  CardDef,
  GemColor,
  PlayerState,
  TakeableColor,
  TokenColor,
  TokenCounts,
} from './types.js';

// Seuils et limites : issus de `meta` dans data/cards.json.
export const MAX_TOKENS = RULES.maxTokens;
export const MAX_RESERVED = RULES.maxReserved;
export const TOTAL_PRIVILEGES = RULES.privileges;
export const CROWN_THRESHOLDS: readonly number[] = RULES.royalThresholds;
export const WIN_POINTS = RULES.victory.totalPoints;
export const WIN_CROWNS = RULES.victory.crowns;
export const WIN_COLOR_POINTS = RULES.victory.pointsInOneColor;

export function emptyTokens(): TokenCounts {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, pearl: 0, gold: 0 };
}

export function tokenTotal(tokens: Partial<TokenCounts>): number {
  return TOKEN_COLORS.reduce((sum, color) => sum + (tokens[color] ?? 0), 0);
}

/** Bonus permanents par couleur (cartes achetées, joker résolu compris). */
export function bonuses(player: PlayerState): Record<GemColor, number> {
  const result: Record<GemColor, number> = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
  for (const owned of player.cards) {
    if (owned.color) result[owned.color] += getCard(owned.id).bonusCount;
  }
  return result;
}

export function hasColoredBonus(player: PlayerState): boolean {
  return player.cards.some((c) => c.color !== null && getCard(c.id).bonusCount > 0);
}

export function crowns(player: PlayerState): number {
  return player.cards.reduce((sum, c) => sum + getCard(c.id).crowns, 0);
}

export function totalPoints(player: PlayerState): number {
  const cardPoints = player.cards.reduce((sum, c) => sum + getCard(c.id).points, 0);
  const royalPoints = player.royals.reduce((sum, id) => sum + getRoyal(id).points, 0);
  return cardPoints + royalPoints;
}

/** Renommée par couleur de bonus : les points d'une carte comptent dans sa couleur associée. */
export function pointsByColor(player: PlayerState): Record<GemColor, number> {
  const result: Record<GemColor, number> = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
  for (const owned of player.cards) {
    if (owned.color) result[owned.color] += getCard(owned.id).points;
  }
  return result;
}

/** Coût restant après déduction des bonus (les Fruits du Démon ne sont jamais réduits). */
export function effectiveCost(card: CardDef, player: PlayerState): Record<TakeableColor, number> {
  const bonus = bonuses(player);
  const result: Record<TakeableColor, number> = {
    white: 0,
    blue: 0,
    green: 0,
    red: 0,
    black: 0,
    pearl: card.cost.pearl ?? 0,
  };
  for (const color of GEM_COLORS) {
    result[color] = Math.max(0, (card.cost[color] ?? 0) - bonus[color]);
  }
  return result;
}

/**
 * Paiement d'une carte : les jetons de la bonne couleur d'abord, l'Or comble le manque.
 * Utiliser l'Or alors qu'on possède la couleur n'est jamais avantageux (l'Or est un joker
 * et ne peut pas être volé), d'où ce paiement automatique. Renvoie `null` si inabordable.
 */
export function computePayment(card: CardDef, player: PlayerState): Partial<TokenCounts> | null {
  const cost = effectiveCost(card, player);
  const paid: Partial<TokenCounts> = {};
  let goldNeeded = 0;
  for (const color of Object.keys(cost) as TakeableColor[]) {
    const need = cost[color];
    if (need === 0) continue;
    const fromColor = Math.min(need, player.tokens[color]);
    if (fromColor > 0) paid[color] = fromColor;
    goldNeeded += need - fromColor;
  }
  if (goldNeeded > player.tokens.gold) return null;
  if (goldNeeded > 0) paid.gold = goldNeeded;
  return paid;
}

/** Une carte joker ne peut être achetée que si l'on possède déjà une carte à bonus coloré. */
export function canBuyCard(card: CardDef, player: PlayerState): boolean {
  if (isJoker(card) && !hasColoredBonus(player)) return false;
  return computePayment(card, player) !== null;
}

export function addTokens(target: TokenCounts, tokens: Partial<TokenCounts>): void {
  for (const color of TOKEN_COLORS) target[color] += tokens[color] ?? 0;
}

export function removeTokens(target: TokenCounts, tokens: Partial<TokenCounts>): void {
  for (const color of TOKEN_COLORS) {
    target[color] -= tokens[color] ?? 0;
    if (target[color] < 0) throw new Error(`Jetons ${color} insuffisants`);
  }
}

export function tokensToList(tokens: Partial<TokenCounts>): TokenColor[] {
  const list: TokenColor[] = [];
  for (const color of TOKEN_COLORS) {
    for (let i = 0; i < (tokens[color] ?? 0); i++) list.push(color);
  }
  return list;
}
