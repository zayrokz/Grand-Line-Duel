import { describe, expect, it } from 'vitest';
import { forfeit, validateMove, victoryReason } from '../src/index.js';
import type { GameState } from '../src/index.js';
import { findCard, giveCard, newGame, play, setBoard, setTokens, view } from './helpers.js';

const l3 = (pattern: 'A' | 'B', color: string) =>
  findCard(
    (c) =>
      c.level === 3 && c.bonus === color && (pattern === 'A' ? c.crowns === 2 : c.crowns === 0),
  );

/** Fait jouer un coup neutre (prendre 1 jeton) pour déclencher la fin de tour. */
function endTurn(s: GameState): GameState {
  setBoard(s, { 0: 'white' });
  return play(s, { type: 'takeTokens', cells: [0] });
}

describe('fin de tour : limite de 10 jetons', () => {
  it('impose de rendre exactement le surplus, au choix du joueur, dans le sac', () => {
    const s = newGame();
    setTokens(s, 0, { red: 4, blue: 4, gold: 2 });
    setBoard(s, { 0: 'green', 1: 'green' });
    const t = play(s, { type: 'takeTokens', cells: [0, 1] });
    expect(t.pub.pending).toEqual([{ kind: 'discard', count: 2 }]);
    expect(validateMove(view(t), { type: 'discard', tokens: { red: 1 } })).toBe('invalid-discard');
    expect(validateMove(view(t), { type: 'discard', tokens: { red: 3 } })).toBe('invalid-discard');
    expect(validateMove(view(t), { type: 'discard', tokens: { pearl: 2 } })).toBe(
      'invalid-discard',
    );
    expect(validateMove(view(t), { type: 'replenish' })).toBe('decision-pending');
    const u = play(t, { type: 'discard', tokens: { gold: 1, green: 1 } });
    expect(u.pub.players[0].tokens).toMatchObject({ red: 4, blue: 4, gold: 1, green: 1 });
    expect(u.pub.bagCount).toBe(2);
    expect([...u.sec.bag].sort()).toEqual(['gold', 'green']);
    expect(u.pub.current).toBe(1);
  });

  it('accepte exactement 10 jetons sans défausse', () => {
    const s = newGame();
    setTokens(s, 0, { red: 4, blue: 4, gold: 1 });
    expect(endTurn(s).pub.pending).toEqual([]);
  });
});

describe('conditions de victoire', () => {
  it('20 Renommée au total, cartes Empereur comprises', () => {
    const s = newGame();
    giveCard(s, 0, l3('B', 'white').id); // 5
    giveCard(s, 0, l3('B', 'green').id); // 5
    giveCard(s, 0, l3('B', 'black').id); // 5
    giveCard(s, 0, l3('A', 'blue').id); // 4
    expect(victoryReason(s.pub.players[0])).toBeNull();
    s.pub.players[0].royals = ['E2']; // +2
    const t = endTurn(s);
    expect(t.pub.winner).toBe(0);
    expect(t.pub.winReason).toBe('points');
    expect(t.pub.log.at(-1)).toEqual({ t: 'end', winner: 0, reason: 'points' });
  });

  it('10 Primes au total', () => {
    const s = newGame();
    for (const color of ['white', 'blue', 'green', 'red', 'black']) {
      giveCard(s, 0, findCard((c) => c.level === 2 && c.crowns === 2 && c.bonus === color).id);
    }
    const t = endTurn(s);
    expect(t.pub.winReason).toBe('crowns');
  });

  it('10 Renommée dans une même couleur, carte joker associée comprise', () => {
    const s = newGame();
    giveCard(s, 0, l3('A', 'red').id); // 4 rouge
    giveCard(s, 0, l3('B', 'red').id); // 4 rouge
    expect(victoryReason(s.pub.players[0])).toBeNull();
    const joker = findCard((c) => c.bonus === 'joker' && c.level === 2 && c.points === 2);
    giveCard(s, 0, joker.id, 'red'); // +2 rouge
    const t = endTurn(s);
    expect(t.pub.winReason).toBe('color');
  });

  it('n’est vérifiée qu’en fin de tour, après la défausse', () => {
    const s = newGame();
    for (const color of ['white', 'blue', 'green', 'red', 'black']) {
      giveCard(s, 0, findCard((c) => c.level === 2 && c.crowns === 2 && c.bonus === color).id);
    }
    setTokens(s, 0, { red: 4, blue: 4, black: 2 });
    const t = endTurn(s);
    expect(t.pub.winner).toBeNull();
    expect(t.pub.pending).toEqual([{ kind: 'discard', count: 1 }]);
    const u = play(t, { type: 'discard', tokens: { white: 1 } });
    expect(u.pub.winner).toBe(0);
  });

  it('ne déclare pas l’adversaire vainqueur à la fin de mon tour', () => {
    const s = newGame();
    giveCard(s, 1, l3('A', 'red').id);
    giveCard(s, 1, l3('B', 'red').id);
    giveCard(s, 1, findCard((c) => c.level === 2 && c.bonus === 'red' && c.points === 2).id);
    const t = endTurn(s);
    expect(t.pub.winner).toBeNull();
    expect(t.pub.current).toBe(1);
  });

  it('refuse tout coup après la fin de partie', () => {
    const s = newGame();
    s.pub.players[0].royals = ['E1'];
    giveCard(s, 0, l3('B', 'white').id);
    giveCard(s, 0, l3('B', 'green').id);
    giveCard(s, 0, l3('B', 'black').id);
    giveCard(s, 0, l3('A', 'blue').id);
    const t = endTurn(s);
    expect(validateMove(view(t, 1), { type: 'takeTokens', cells: [1] })).toBe('game-over');
  });
});

describe('ordre des tours et abandon', () => {
  it('refuse de jouer hors de son tour', () => {
    const s = newGame();
    expect(validateMove(view(s, 1), { type: 'takeTokens', cells: [0] })).toBe('not-your-turn');
    expect(() => play(s, { type: 'takeTokens', cells: [0] }, 1)).toThrow();
  });

  it('alterne les joueurs et incrémente le numéro de tour', () => {
    const s = newGame();
    const t = endTurn(s);
    expect([t.pub.current, t.pub.turn]).toEqual([1, 2]);
    const u = endTurn(t);
    expect([u.pub.current, u.pub.turn]).toEqual([0, 3]);
  });

  it('l’abandon ou le dépassement du délai donne la victoire à l’adversaire', () => {
    const s = newGame();
    const t = forfeit(s, 0, 'resign');
    expect(t.pub.winner).toBe(1);
    expect(t.pub.winReason).toBe('resign');
    expect(forfeit(t, 1, 'timeout')).toBe(t); // sans effet une fois la partie finie
    expect(forfeit(s, 1, 'timeout').pub.winner).toBe(0);
  });
});
