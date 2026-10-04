import { describe, expect, it } from 'vitest';
import rawData from '../data/cards.json' with { type: 'json' };
import { CardDataSchema, CARDS, ROYALS, GEM_COLORS } from '../src/index.js';

describe('données de cartes', () => {
  it('respecte les quantités du matériel : 30 / 24 / 13 cartes et 4 cartes Empereur', () => {
    expect(CARDS).toHaveLength(67);
    expect(CARDS.filter((c) => c.level === 1)).toHaveLength(30);
    expect(CARDS.filter((c) => c.level === 2)).toHaveLength(24);
    expect(CARDS.filter((c) => c.level === 3)).toHaveLength(13);
    expect(ROYALS).toHaveLength(4);
  });

  it('a des identifiants uniques', () => {
    const ids = [...CARDS.map((c) => c.id), ...ROYALS.map((r) => r.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ne demande jamais d’Or dans un coût', () => {
    for (const card of CARDS) expect(Object.keys(card.cost)).not.toContain('gold');
  });

  it('réserve la capacité « jeton » aux cartes à bonus coloré', () => {
    for (const card of CARDS.filter((c) => c.ability === 'token')) {
      expect(GEM_COLORS).toContain(card.bonus);
    }
  });

  it('rejette un fichier incohérent', () => {
    const broken = structuredClone(rawData) as { cards: { level: number }[] };
    broken.cards.pop();
    expect(CardDataSchema.safeParse(broken).success).toBe(false);

    const badToken = structuredClone(rawData) as {
      cards: { ability: string | null; bonus: string | null }[];
    };
    badToken.cards[0]!.ability = 'token';
    badToken.cards[0]!.bonus = 'joker';
    expect(CardDataSchema.safeParse(badToken).success).toBe(false);
  });

  it('signale clairement que le jeu de données est un substitut', () => {
    expect(rawData.placeholder).toBe(true);
    expect(rawData.$comment).toMatch(/NON officiel/);
  });
});
