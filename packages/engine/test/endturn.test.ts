import { describe, expect, it } from 'vitest';
import { forfeit, validateMove, victoryReason } from '../src/index.js';
import type { GameState, GemColor } from '../src/index.js';
import { giveCard, newGame, play, setBoard, setTokens, view } from './helpers.js';

/** Donne une série de cartes (identifiants de data/cards.json) ; joker : couleur imposée. */
function give(s: GameState, seat: 0 | 1, ids: string[], jokerColor?: GemColor): void {
  for (const id of ids) giveCard(s, seat, id, jokerColor);
}

// Navire de 18 Renommée sans couleur dominante : 3 cartes « lady » (4) + L3-13 (6, sans bonus).
const EIGHTEEN_POINTS = ['L3-06', 'L3-07', 'L3-08', 'L3-13'];
// 5 cartes « crown » de niveau 3 : 2 Couronnes et 3 points chacune (10 Couronnes, 15 points).
const TEN_CROWNS = ['L3-01', 'L3-02', 'L3-03', 'L3-04', 'L3-05'];
// 8 points rouges : L3-09 (4) + L3-04 (3) + L1-09 (1).
const EIGHT_RED = ['L3-09', 'L3-04', 'L1-09'];
// Joker de niveau 2 à 2 points.
const JOKER_TWO_POINTS = 'L2-23';

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
  it('20 Renommée au total, cartes Royales comprises', () => {
    const s = newGame();
    give(s, 0, EIGHTEEN_POINTS);
    expect(victoryReason(s.pub.players[0])).toBeNull();
    s.pub.players[0].royals = ['R-1']; // +2
    const t = endTurn(s);
    expect(t.pub.winner).toBe(0);
    expect(t.pub.winReason).toBe('points');
    expect(t.pub.log.at(-1)).toEqual({ t: 'end', winner: 0, reason: 'points' });
  });

  it('10 Couronnes (Primes) au total', () => {
    const s = newGame();
    give(s, 0, TEN_CROWNS);
    const t = endTurn(s);
    expect(t.pub.winReason).toBe('crowns');
  });

  it('10 Renommée dans une même couleur, carte joker associée comprise', () => {
    const s = newGame();
    give(s, 0, EIGHT_RED);
    expect(victoryReason(s.pub.players[0])).toBeNull();
    giveCard(s, 0, JOKER_TWO_POINTS, 'red'); // +2 rouge
    const t = endTurn(s);
    expect(t.pub.winReason).toBe('color');
  });

  it('ne compte pas les points d’une carte sans bonus dans une couleur', () => {
    const s = newGame();
    give(s, 0, ['L3-09', 'L3-04', 'L3-13']); // 7 rouges + 6 sans couleur
    expect(victoryReason(s.pub.players[0])).toBeNull();
  });

  it('n’est vérifiée qu’en fin de tour, après la défausse', () => {
    const s = newGame();
    give(s, 0, TEN_CROWNS);
    setTokens(s, 0, { red: 4, blue: 4, black: 2 });
    const t = endTurn(s);
    expect(t.pub.winner).toBeNull();
    expect(t.pub.pending).toEqual([{ kind: 'discard', count: 1 }]);
    const u = play(t, { type: 'discard', tokens: { white: 1 } });
    expect(u.pub.winner).toBe(0);
  });

  it('ne déclare pas l’adversaire vainqueur à la fin de mon tour', () => {
    const s = newGame();
    give(s, 1, EIGHT_RED);
    giveCard(s, 1, JOKER_TWO_POINTS, 'red');
    const t = endTurn(s);
    expect(t.pub.winner).toBeNull();
    expect(t.pub.current).toBe(1);
  });

  it('refuse tout coup après la fin de partie', () => {
    const s = newGame();
    s.pub.players[0].royals = ['R-3'];
    give(s, 0, EIGHTEEN_POINTS);
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
    const t = forfeit(s.pub, 0, 'resign');
    expect(t.winner).toBe(1);
    expect(t.winReason).toBe('resign');
    expect(t.log.at(-1)).toEqual({ t: 'end', winner: 1, reason: 'resign' });
    expect(s.pub.winner).toBeNull(); // l'état d'origine n'est pas modifié
    expect(forfeit(t, 1, 'timeout')).toBe(t); // sans effet une fois la partie finie
    expect(forfeit(s.pub, 1, 'timeout').winner).toBe(0);
  });
});
