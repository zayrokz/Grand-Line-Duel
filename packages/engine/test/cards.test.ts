import { describe, expect, it } from 'vitest';
import {
  computePayment,
  effectiveCost,
  getCard,
  getLegalMoves,
  toPlayerView,
  validateMove,
} from '../src/index.js';
import {
  cellsOf,
  findCard,
  giveCard,
  giveReserved,
  newGame,
  play,
  putInPyramid,
  setBoard,
  setTokens,
  view,
} from './helpers.js';

describe('action obligatoire : réserver une carte', () => {
  it('prend l’Or choisi et une carte de la pyramide, remplacée par une carte du même niveau', () => {
    const s = newGame();
    const gold = cellsOf(s, 'gold')[0]!;
    const target = s.pub.pyramid[2][1]!;
    const top = s.sec.decks[2][0]!;
    const t = play(s, { type: 'reserve', goldCell: gold, cardId: target });
    expect(t.pub.board[gold]).toBeNull();
    expect(t.pub.players[0].tokens.gold).toBe(1);
    expect(t.sec.reserved[0]).toEqual([target]);
    expect(t.pub.players[0].reservedLevels).toEqual([2]);
    expect(t.pub.pyramid[2][1]).toBe(top);
    expect(t.pub.deckCounts[2]).toBe(19);
    expect(t.pub.current).toBe(1);
  });

  it('peut réserver la carte du dessus d’un paquet', () => {
    const s = newGame();
    const gold = cellsOf(s, 'gold')[0]!;
    const top = s.sec.decks[3][0]!;
    const t = play(s, { type: 'reserveDeck', goldCell: gold, level: 3 });
    expect(t.sec.reserved[0]).toEqual([top]);
    expect(t.pub.deckCounts[3]).toBe(9);
    expect(t.pub.pyramid[3]).toEqual(s.pub.pyramid[3]);
  });

  it('exige un Or disponible et la case choisie doit contenir de l’Or', () => {
    const s = newGame();
    setBoard(s, { 0: 'red' });
    const cardId = s.pub.pyramid[1][0]!;
    expect(validateMove(view(s), { type: 'reserve', goldCell: 0, cardId })).toBe('gold-required');
    expect(getLegalMoves(view(s)).some((m) => m.type.startsWith('reserve'))).toBe(false);
  });

  it('limite à 3 cartes réservées', () => {
    const s = newGame();
    for (const id of s.sec.decks[1].slice(0, 3)) giveReserved(s, 0, id);
    const gold = cellsOf(s, 'gold')[0]!;
    expect(validateMove(view(s), { type: 'reserveDeck', goldCell: gold, level: 1 })).toBe(
      'reserve-limit',
    );
  });

  it('refuse un paquet vide ou une carte absente de la pyramide', () => {
    const s = newGame();
    const gold = cellsOf(s, 'gold')[0]!;
    s.sec.decks[3] = [];
    s.pub.deckCounts[3] = 0;
    expect(validateMove(view(s), { type: 'reserveDeck', goldCell: gold, level: 3 })).toBe(
      'deck-empty',
    );
    const hidden = s.sec.decks[1][0]!;
    expect(validateMove(view(s), { type: 'reserve', goldCell: gold, cardId: hidden })).toBe(
      'card-unavailable',
    );
  });

  it('laisse l’emplacement vide quand le paquet est épuisé', () => {
    const s = newGame();
    s.sec.decks[1] = [];
    s.pub.deckCounts[1] = 0;
    const gold = cellsOf(s, 'gold')[0]!;
    const t = play(s, { type: 'reserve', goldCell: gold, cardId: s.pub.pyramid[1][4]! });
    expect(t.pub.pyramid[1][4]).toBeNull();
  });

  it('garde les cartes réservées secrètes : seul le niveau est public', () => {
    const s = newGame();
    const gold = cellsOf(s, 'gold')[0]!;
    const t = play(s, { type: 'reserveDeck', goldCell: gold, level: 2 });
    const secret = t.sec.reserved[0][0]!;
    expect(JSON.stringify(t.pub)).not.toContain(secret);
    expect(toPlayerView(t, 0).reserved).toEqual([secret]);
    expect(toPlayerView(t, 1).reserved).toEqual([]);
  });
});

describe('action obligatoire : acheter une carte', () => {
  const plain = findCard((c) => c.level === 1 && c.ability === null && c.bonus === 'white');

  it('paie le coût, remet les jetons dans le sac et remplace la carte', () => {
    const s = newGame();
    putInPyramid(s, plain.id);
    setTokens(s, 0, { ...plain.cost, gold: 1 });
    const t = play(s, { type: 'buy', cardId: plain.id });
    expect(t.pub.players[0].cards).toEqual([{ id: plain.id, color: 'white' }]);
    expect(t.pub.players[0].tokens).toEqual({
      white: 0,
      blue: 0,
      green: 0,
      red: 0,
      black: 0,
      pearl: 0,
      gold: 1,
    });
    const spent = Object.values(plain.cost).reduce((a, b) => a + b, 0);
    expect(t.pub.bagCount).toBe(spent);
    expect(t.sec.bag).toHaveLength(spent);
    expect(t.pub.pyramid[1]).not.toContain(plain.id);
    expect(t.pub.pyramid[1].every((id) => id !== null)).toBe(true);
  });

  it('réduit le coût grâce aux bonus et utilise l’Or comme joker', () => {
    const s = newGame();
    const target = findCard(
      (c) => c.level === 2 && (c.cost.pearl ?? 0) === 1 && c.bonus !== 'joker',
    );
    const [colorA] = Object.keys(target.cost).filter((k) => k !== 'pearl') as ('white' | 'blue')[];
    const bonusCard = findCard((c) => c.level === 1 && c.bonus === colorA && c.ability === null);
    giveCard(s, 0, bonusCard.id);
    const cost = effectiveCost(target, s.pub.players[0]);
    expect(cost[colorA!]).toBe((target.cost[colorA!] ?? 0) - 1);
    expect(cost.pearl).toBe(1); // les Fruits du Démon ne sont jamais réduits
    // Aucun jeton sauf de l'Or en quantité suffisante.
    const needed = Object.values(cost).reduce((a, b) => a + b, 0);
    setTokens(s, 0, { gold: needed });
    expect(computePayment(target, s.pub.players[0])).toEqual({ gold: needed });
    setTokens(s, 0, { gold: needed - 1 });
    expect(computePayment(target, s.pub.players[0])).toBeNull();
  });

  it('préfère les jetons de couleur à l’Or', () => {
    const s = newGame();
    setTokens(s, 0, { ...plain.cost, gold: 3 });
    expect(computePayment(plain, s.pub.players[0])).toEqual(plain.cost);
  });

  it('autorise un coût réduit à zéro par les bonus', () => {
    const s = newGame();
    const target = findCard((c) => c.level === 1 && c.bonus === 'blue' && !c.cost.pearl);
    for (const [color, n] of Object.entries(target.cost)) {
      for (let i = 0; i < n; i++) {
        const card = findCard(
          (c) =>
            c.bonus === color &&
            c.bonusCount === 1 &&
            !s.pub.players[0].cards.some((o) => o.id === c.id),
        );
        giveCard(s, 0, card.id);
      }
    }
    putInPyramid(s, target.id);
    setTokens(s, 0, {});
    expect(computePayment(target, s.pub.players[0])).toEqual({});
    const t = play(s, { type: 'buy', cardId: target.id });
    expect(t.pub.players[0].cards.map((c) => c.id)).toContain(target.id);
  });

  it('refuse une carte inabordable ou non visible', () => {
    const s = newGame();
    const visible = s.pub.pyramid[3][0]!;
    expect(validateMove(view(s), { type: 'buy', cardId: visible })).toBe('cannot-afford');
    expect(validateMove(view(s), { type: 'buy', cardId: s.sec.decks[3][0]! })).toBe(
      'card-unavailable',
    );
    expect(validateMove(view(s), { type: 'buy', cardId: 'L9-99' })).toBe('card-unavailable');
  });

  it('achète une carte réservée, qui quitte la réserve', () => {
    const s = newGame();
    giveReserved(s, 0, plain.id);
    const other = s.sec.decks[2][0]!;
    giveReserved(s, 0, other);
    setTokens(s, 0, { ...plain.cost });
    const t = play(s, { type: 'buy', cardId: plain.id });
    expect(t.sec.reserved[0]).toEqual([other]);
    expect(t.pub.players[0].reservedLevels).toEqual([getCard(other).level]);
    expect(t.pub.log).toContainEqual(
      expect.objectContaining({ t: 'buy', card: plain.id, fromReserve: true }),
    );
  });

  it('ne permet pas d’acheter la carte réservée de l’adversaire', () => {
    const s = newGame();
    giveReserved(s, 1, plain.id);
    setTokens(s, 0, { ...plain.cost });
    expect(validateMove(view(s), { type: 'buy', cardId: plain.id })).toBe('card-unavailable');
  });
});
