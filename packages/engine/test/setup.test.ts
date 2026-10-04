import { describe, expect, it } from 'vitest';
import { createGame, TOKEN_COLORS } from '../src/index.js';

describe('mise en place', () => {
  const s = createGame(123, 0);

  it('remplit le plateau avec les 25 jetons et laisse le sac vide', () => {
    const counts = Object.fromEntries(TOKEN_COLORS.map((c) => [c, 0]));
    for (const token of s.pub.board) {
      expect(token).not.toBeNull();
      counts[token!] = (counts[token!] ?? 0) + 1;
    }
    expect(counts).toEqual({ white: 4, blue: 4, green: 4, red: 4, black: 4, pearl: 2, gold: 3 });
    expect(s.pub.bagCount).toBe(0);
    expect(s.sec.bag).toEqual([]);
  });

  it('révèle 3 / 4 / 5 cartes et garde le reste en paquets', () => {
    expect(s.pub.pyramid[3]).toHaveLength(3);
    expect(s.pub.pyramid[2]).toHaveLength(4);
    expect(s.pub.pyramid[1]).toHaveLength(5);
    expect(s.pub.deckCounts).toEqual({ 1: 25, 2: 20, 3: 10 });
    expect(s.sec.decks[1]).toHaveLength(25);
    const all = [
      ...s.pub.pyramid[1],
      ...s.pub.pyramid[2],
      ...s.pub.pyramid[3],
      ...s.sec.decks[1],
      ...s.sec.decks[2],
      ...s.sec.decks[3],
    ];
    expect(new Set(all).size).toBe(67);
  });

  it('donne 1 Log Pose à l’adversaire du premier joueur', () => {
    expect(s.pub.current).toBe(0);
    expect(s.pub.players[1].privileges).toBe(1);
    expect(s.pub.players[0].privileges).toBe(0);
    expect(s.pub.privileges).toBe(2);
    const t = createGame(123, 1);
    expect(t.pub.players[0].privileges).toBe(1);
  });

  it('pose les 4 cartes Empereur', () => {
    expect(s.pub.royals).toEqual(['E1', 'E2', 'E3', 'E4']);
  });

  it('est déterministe pour une graine donnée et varie selon la graine', () => {
    expect(createGame(7)).toEqual(createGame(7));
    expect(createGame(7).pub.board).not.toEqual(createGame(8).pub.board);
  });

  it('tire le premier joueur avec la graine quand il n’est pas imposé', () => {
    const firsts = new Set(Array.from({ length: 20 }, (_, i) => createGame(i).pub.current));
    expect(firsts).toEqual(new Set([0, 1]));
  });
});
