import rawData from '../data/cards.json' with { type: 'json' };
import { CardDataSchema } from './schema.js';
import type { CardDef, Level, RoyalDef } from './types.js';

/**
 * Données de cartes validées au chargement : un fichier invalide fait échouer immédiatement
 * le serveur, le client et les tests, avec un message explicite.
 */
const parsed = CardDataSchema.safeParse(rawData);
if (!parsed.success) {
  throw new Error(`data/cards.json invalide :\n${parsed.error.message}`);
}

export const CARD_DATA_IS_PLACEHOLDER: boolean = parsed.data.placeholder;

export const CARDS: readonly CardDef[] = parsed.data.cards;
export const ROYALS: readonly RoyalDef[] = parsed.data.royals;

const cardById = new Map(CARDS.map((c) => [c.id, c]));
const royalById = new Map(ROYALS.map((r) => [r.id, r]));

export function getCard(id: string): CardDef {
  const card = cardById.get(id);
  if (!card) throw new Error(`Carte inconnue : ${id}`);
  return card;
}

export function getRoyal(id: string): RoyalDef {
  const royal = royalById.get(id);
  if (!royal) throw new Error(`Carte Empereur inconnue : ${id}`);
  return royal;
}

export function isCardId(id: string): boolean {
  return cardById.has(id);
}

export function cardsOfLevel(level: Level): CardDef[] {
  return CARDS.filter((c) => c.level === level);
}

/** Nombre de cartes visibles par niveau dans la pyramide. */
export const PYRAMID_SIZE: Record<Level, number> = { 1: 5, 2: 4, 3: 3 };
