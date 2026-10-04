import rawData from '../data/cards.json' with { type: 'json' };
import { CardDataSchema } from './schema.js';
import type { CardDef, GameRules, Level, RoyalDef } from './types.js';

/**
 * Données de jeu (`data/cards.json`) : source de vérité des cartes, des cartes Royales, des
 * quantités de jetons et des seuils. Validées au chargement : un fichier invalide fait échouer
 * immédiatement le serveur, le client et les tests, avec un message explicite.
 */
const parsed = CardDataSchema.safeParse(rawData);
if (!parsed.success) {
  throw new Error(`data/cards.json invalide :\n${parsed.error.message}`);
}
const data = parsed.data;

export const CARDS: readonly CardDef[] = data.cards;
export const ROYALS: readonly RoyalDef[] = data.royals;

/** Paramètres de partie issus de `meta`. */
export const RULES: GameRules = {
  tokens: data.meta.tokens,
  privileges: data.meta.privileges,
  pyramid: {
    1: data.meta.pyramid.level1,
    2: data.meta.pyramid.level2,
    3: data.meta.pyramid.level3,
  },
  royalThresholds: data.meta.royalThresholds,
  victory: data.meta.victory,
  maxTokens: data.meta.maxTokens,
  maxReserved: data.meta.maxReserved,
};

/** Nombre de cartes visibles par niveau dans la pyramide. */
export const PYRAMID_SIZE: Record<Level, number> = RULES.pyramid;

const cardById = new Map(CARDS.map((c) => [c.id, c]));
const royalById = new Map(ROYALS.map((r) => [r.id, r]));

export function getCard(id: string): CardDef {
  const card = cardById.get(id);
  if (!card) throw new Error(`Carte inconnue : ${id}`);
  return card;
}

export function getRoyal(id: string): RoyalDef {
  const royal = royalById.get(id);
  if (!royal) throw new Error(`Carte Royale inconnue : ${id}`);
  return royal;
}

export function isCardId(id: string): boolean {
  return cardById.has(id);
}

export function isRoyalId(id: string): boolean {
  return royalById.has(id);
}

export function cardsOfLevel(level: Level): CardDef[] {
  return CARDS.filter((c) => c.level === level);
}

/** Carte joker : son bonus s'associe à la couleur d'une carte possédée (capacité `associate`). */
export function isJoker(card: CardDef): boolean {
  return card.abilities.includes('associate');
}
