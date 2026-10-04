import { describe, expect, it } from 'vitest';
import { createGame, nextRandom, sha256Hex, shuffle, TOKEN_COLORS } from '../src/index.js';
import type { RngState } from '../src/index.js';

describe('mise en place', () => {
  const s = createGame('mise-en-place', 0);

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
    const t = createGame('mise-en-place', 1);
    expect(t.pub.players[0].privileges).toBe(1);
  });

  it('pose les 4 cartes Royales (Empereurs)', () => {
    expect(s.pub.royals).toEqual(['R-1', 'R-2', 'R-3', 'R-4']);
  });

  it('est déterministe pour une graine donnée et varie selon la graine', () => {
    expect(createGame('a')).toEqual(createGame('a'));
    expect(createGame('a').pub.board).not.toEqual(createGame('b').pub.board);
    expect(() => createGame('')).toThrow();
  });

  it('tire le premier joueur avec la graine quand il n’est pas imposé', () => {
    const firsts = new Set(Array.from({ length: 20 }, (_, i) => createGame(`g${i}`).pub.current));
    expect(firsts).toEqual(new Set([0, 1]));
  });
});

describe('générateur pseudo-aléatoire', () => {
  it('implémente SHA-256 conformément aux vecteurs de test officiels', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(sha256Hex('é'.repeat(100))).toBe(sha256Hex('é'.repeat(100)));
  });

  it('produit des tirages uniformes dans [0, 1) et un mélange déterministe', () => {
    let rng: RngState = { seed: 'uniformite', counter: 0 };
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 5000; i++) {
      const [value, next] = nextRandom(rng);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      buckets[Math.floor(value * 10)]++;
      rng = next;
    }
    for (const count of buckets) expect(count).toBeGreaterThan(400);
    expect(rng.counter).toBe(5000);
    const [a] = shuffle([1, 2, 3, 4, 5], { seed: 'x', counter: 0 });
    const [b] = shuffle([1, 2, 3, 4, 5], { seed: 'x', counter: 0 });
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
