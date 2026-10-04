import { describe, expect, it } from 'vitest';
import rawData from '../data/cards.json' with { type: 'json' };
import {
  CardDataSchema,
  CARDS,
  createGame,
  CROWN_THRESHOLDS,
  getCard,
  GEM_COLORS,
  MAX_RESERVED,
  MAX_TOKENS,
  PYRAMID_SIZE,
  ROYALS,
  RULES,
  TOTAL_PRIVILEGES,
  WIN_COLOR_POINTS,
  WIN_CROWNS,
  WIN_POINTS,
} from '../src/index.js';

type Raw = typeof rawData;
const clone = (): Raw => structuredClone(rawData);
const rejects = (mutate: (data: Raw) => void): boolean => {
  const data = clone();
  mutate(data);
  return !CardDataSchema.safeParse(data).success;
};

describe('données de jeu (data/cards.json, source de vérité)', () => {
  it('sont chargées telles quelles, sans transformation', () => {
    expect(CARDS).toEqual(rawData.cards);
    expect(ROYALS).toEqual(rawData.royals);
  });

  it('respectent les quantités du matériel : 30 / 24 / 13 cartes et 4 cartes Royales', () => {
    expect(CARDS).toHaveLength(67);
    expect(CARDS.filter((c) => c.level === 1)).toHaveLength(30);
    expect(CARDS.filter((c) => c.level === 2)).toHaveLength(24);
    expect(CARDS.filter((c) => c.level === 3)).toHaveLength(13);
    expect(ROYALS.map((r) => r.id)).toEqual(['R-1', 'R-2', 'R-3', 'R-4']);
  });

  it('fournissent les paramètres de partie à partir de meta', () => {
    const { meta } = rawData;
    expect(RULES.tokens).toEqual(meta.tokens);
    expect(TOTAL_PRIVILEGES).toBe(meta.privileges);
    expect(PYRAMID_SIZE).toEqual({
      1: meta.pyramid.level1,
      2: meta.pyramid.level2,
      3: meta.pyramid.level3,
    });
    expect(CROWN_THRESHOLDS).toEqual(meta.royalThresholds);
    expect([WIN_POINTS, WIN_CROWNS, WIN_COLOR_POINTS]).toEqual([
      meta.victory.totalPoints,
      meta.victory.crowns,
      meta.victory.pointsInOneColor,
    ]);
    expect([MAX_TOKENS, MAX_RESERVED]).toEqual([meta.maxTokens, meta.maxReserved]);
    expect([...meta.colors].sort()).toEqual([...GEM_COLORS].sort());
  });

  it('servent à la mise en place (pyramide, paquets, jetons, Log Pose, cartes Royales)', () => {
    const s = createGame('donnees', 0);
    for (const level of [1, 2, 3] as const) {
      expect(s.pub.pyramid[level]).toHaveLength(PYRAMID_SIZE[level]);
    }
    expect(s.pub.board.filter((t) => t === 'gold')).toHaveLength(rawData.meta.tokens.gold);
    expect(s.pub.board.filter((t) => t === 'pearl')).toHaveLength(rawData.meta.tokens.pearl);
    expect(s.pub.privileges + s.pub.players[1].privileges).toBe(rawData.meta.privileges);
    expect(s.pub.royals).toEqual(rawData.royals.map((r) => r.id));
  });

  it('ont des identifiants uniques et jamais d’Or dans un coût', () => {
    const ids = [...CARDS.map((c) => c.id), ...ROYALS.map((r) => r.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of CARDS) expect(Object.keys(card.cost)).not.toContain('gold');
  });

  it('associent bonus joker et capacité « associate », et réservent « take_token » aux cartes colorées', () => {
    for (const card of CARDS) {
      expect(card.bonus === 'joker').toBe(card.abilities.includes('associate'));
      if (card.abilities.includes('take_token')) expect(GEM_COLORS).toContain(card.bonus);
    }
    expect(getCard('L3-12').abilities).toEqual(['associate', 'extra_turn']);
    expect(getCard('L1-30')).toMatchObject({ bonus: null, bonusCount: 0, points: 3 });
  });

  it('rejettent un fichier incohérent', () => {
    expect(CardDataSchema.safeParse(clone()).success).toBe(true);
    expect(rejects((d) => d.cards.pop())).toBe(true);
    expect(rejects((d) => d.royals.pop())).toBe(true);
    expect(rejects((d) => (d.cards[1]!.id = d.cards[0]!.id))).toBe(true);
    expect(rejects((d) => (d.cards[0]!.abilities = ['associate'] as never))).toBe(true);
    expect(rejects((d) => (d.cards[25]!.abilities = [] as never))).toBe(true); // joker sans association
    expect(rejects((d) => (d.cards[0]!.abilities = ['fly'] as never))).toBe(true);
    expect(rejects((d) => ((d.cards[0]!.cost as unknown as Record<string, number>).gold = 1))).toBe(
      true,
    );
    expect(rejects((d) => ((d.cards[0] as Record<string, unknown>).name = 'x'))).toBe(true);
    expect(rejects((d) => (d.meta.tokens.gold = 4))).toBe(true); // 26 jetons pour 25 cases
    expect(rejects((d) => (d.meta.royalThresholds = [6, 3]))).toBe(true);
    expect(
      rejects((d) => (d.meta.colors = ['white', 'blue', 'green', 'red', 'pink'] as never)),
    ).toBe(true);
    expect(rejects((d) => ((d.royals[0]!.abilities as string[]) = ['associate']))).toBe(true);
  });
});
