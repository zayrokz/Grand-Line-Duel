import { describe, expect, it } from 'vitest';
import {
  effectiveCost,
  getLegalMoves,
  pointsByColor,
  bonuses,
  validateMove,
} from '../src/index.js';
import type { CardDef, GameState, Move, Seat } from '../src/index.js';
import {
  findCard,
  giveCard,
  newGame,
  play,
  putInPyramid,
  setBoard,
  setTokens,
  view,
} from './helpers.js';

/** Donne au joueur exactement les jetons nécessaires pour acheter la carte. */
function canPay(s: GameState, seat: Seat, card: CardDef): void {
  setTokens(s, seat, effectiveCost(card, s.pub.players[seat]));
}

function buyNow(s: GameState, card: CardDef): GameState {
  putInPyramid(s, card.id);
  canPay(s, s.pub.current, card);
  return play(s, { type: 'buy', cardId: card.id });
}

describe('capacité : rejouer', () => {
  const card = findCard((c) => c.ability === 'extraTurn' && c.level === 1);

  it('termine le tour et en donne un nouveau au même joueur', () => {
    const s = newGame();
    const t = buyNow(s, card);
    expect(t.pub.current).toBe(0);
    expect(t.pub.turn).toBe(2);
    expect(t.pub.flags).toEqual({ usedPrivileges: false, replenished: false, extraTurn: false });
    expect(t.pub.log.at(-1)).toEqual({ t: 'turn', p: 0, extra: true });
    // Le tour supplémentaire est un tour normal, puis la main passe.
    setBoard(t, { 0: 'red' });
    const u = play(t, { type: 'takeTokens', cells: [0] });
    expect(u.pub.current).toBe(1);
  });

  it('n’est pas cumulable au sein d’un même tour', () => {
    const s = newGame();
    s.pub.flags.extraTurn = true;
    s.pub.pending = [{ kind: 'royal' }];
    const t = play(s, { type: 'chooseRoyal', royalId: 'E4' }); // E4 : rejouer
    expect(t.pub.current).toBe(0);
    setBoard(t, { 0: 'red' });
    expect(play(t, { type: 'takeTokens', cells: [0] }).pub.current).toBe(1);
  });
});

describe('capacité : bonus joker', () => {
  const joker = findCard((c) => c.bonus === 'joker' && c.level === 1);
  const red = findCard((c) => c.bonus === 'red' && c.level === 1 && c.ability === null);
  const blue = findCard((c) => c.bonus === 'blue' && c.level === 1 && c.ability === null);

  it('ne peut pas être acheté sans carte à bonus coloré', () => {
    const s = newGame();
    putInPyramid(s, joker.id);
    canPay(s, 0, joker);
    expect(validateMove(view(s), { type: 'buy', cardId: joker.id })).toBe('joker-needs-bonus');
  });

  it('prend la couleur d’une carte possédée et compte dans cette couleur', () => {
    const s = newGame();
    giveCard(s, 0, red.id);
    giveCard(s, 0, blue.id);
    const t = buyNow(s, joker);
    expect(t.pub.pending).toEqual([{ kind: 'joker', cardId: joker.id }]);
    expect(getLegalMoves(view(t))).toEqual([
      { type: 'jokerColor', color: 'blue' },
      { type: 'jokerColor', color: 'red' },
    ]);
    expect(validateMove(view(t), { type: 'jokerColor', color: 'green' })).toBe('invalid-color');
    // Aucune autre action tant que la décision n'est pas prise.
    expect(validateMove(view(t), { type: 'takeTokens', cells: [0] })).toBe('decision-pending');
    const u = play(t, { type: 'jokerColor', color: 'red' });
    const me = u.pub.players[0];
    expect(me.cards.find((c) => c.id === joker.id)?.color).toBe('red');
    expect(bonuses(me).red).toBe(2);
    expect(pointsByColor(me).red).toBe(red.points + joker.points);
    expect(u.pub.current).toBe(1);
  });
});

describe('capacité : jeton', () => {
  const card = findCard((c) => c.ability === 'token' && c.bonus === 'green');

  it('prend 1 jeton de la couleur du bonus sur le plateau', () => {
    const s = newGame();
    setBoard(s, { 3: 'green', 17: 'green', 4: 'red' });
    const t = buyNow(s, card);
    expect(t.pub.pending).toEqual([{ kind: 'token', color: 'green' }]);
    expect(validateMove(view(t), { type: 'abilityToken', cell: 4 })).toBe('invalid-cells');
    const u = play(t, { type: 'abilityToken', cell: 17 });
    expect(u.pub.players[0].tokens.green).toBe(1);
    expect(u.pub.board[17]).toBeNull();
    expect(u.pub.current).toBe(1);
  });

  it('ne fait rien s’il n’y a pas de jeton de cette couleur', () => {
    const s = newGame();
    setBoard(s, { 4: 'red' });
    const t = buyNow(s, card);
    expect(t.pub.pending).toEqual([]);
    expect(t.pub.current).toBe(1);
  });
});

describe('capacité : Log Pose', () => {
  const card = findCard((c) => c.ability === 'privilege' && c.level === 1);

  it('prend 1 Log Pose dans la réserve', () => {
    const s = newGame();
    const t = buyNow(s, card);
    expect(t.pub.players[0].privileges).toBe(1);
    expect(t.pub.privileges).toBe(1);
  });

  it('le prend à l’adversaire s’il n’en reste aucun', () => {
    const s = newGame();
    s.pub.privileges = 0;
    s.pub.players[1].privileges = 3;
    const t = buyNow(s, card);
    expect(t.pub.players[0].privileges).toBe(1);
    expect(t.pub.players[1].privileges).toBe(2);
  });
});

describe('capacité : vol', () => {
  const card = findCard((c) => c.ability === 'steal' && c.level === 1);

  it('prend 1 Gemme ou Perle à l’adversaire, jamais d’Or', () => {
    const s = newGame();
    setTokens(s, 1, { pearl: 1, red: 2, gold: 2 });
    const t = buyNow(s, card);
    expect(t.pub.pending).toEqual([{ kind: 'steal' }]);
    expect(getLegalMoves(view(t)).map((m) => (m.type === 'steal' ? m.color : null))).toEqual([
      'red',
      'pearl',
    ]);
    // Forme invalide côté schéma, mais le moteur doit aussi la refuser.
    const stealGold = { type: 'steal', color: 'gold' } as unknown as Move;
    expect(validateMove(view(t), stealGold)).toBe('invalid-color');
    const u = play(t, { type: 'steal', color: 'pearl' });
    expect(u.pub.players[0].tokens.pearl).toBe(1);
    expect(u.pub.players[1].tokens).toMatchObject({ pearl: 0, red: 2, gold: 2 });
  });

  it('ne fait rien si l’adversaire n’a que de l’Or', () => {
    const s = newGame();
    setTokens(s, 1, { gold: 3 });
    const t = buyNow(s, card);
    expect(t.pub.pending).toEqual([]);
    expect(t.pub.current).toBe(1);
  });
});

describe('Primes et cartes Empereur', () => {
  const crownCards = (color: string) =>
    findCard((c) => c.level === 1 && c.crowns === 1 && c.bonus === color);

  it('donne une carte Empereur au choix à la 3e Prime', () => {
    const s = newGame();
    giveCard(s, 0, crownCards('blue').id);
    giveCard(s, 0, crownCards('green').id);
    const t = buyNow(s, crownCards('white'));
    expect(t.pub.pending).toEqual([{ kind: 'royal' }]);
    expect(getLegalMoves(view(t))).toHaveLength(4);
    expect(validateMove(view(t), { type: 'chooseRoyal', royalId: 'E9' })).toBe('invalid-royal');
    const u = play(t, { type: 'chooseRoyal', royalId: 'E1' });
    expect(u.pub.players[0].royals).toEqual(['E1']);
    expect(u.pub.royals).toEqual(['E2', 'E3', 'E4']);
    expect(u.pub.current).toBe(1);
  });

  it('ne redonne pas de carte Empereur entre la 3e et la 6e Prime', () => {
    const s = newGame();
    for (const color of ['blue', 'green', 'red']) giveCard(s, 0, crownCards(color).id);
    s.pub.players[0].royals = ['E1'];
    s.pub.royals = ['E2', 'E3', 'E4'];
    const t = buyNow(s, crownCards('white'));
    expect(t.pub.pending).toEqual([]);
    expect(t.pub.current).toBe(1);
  });

  it('donne une seconde carte Empereur à la 6e Prime', () => {
    const s = newGame();
    const twoCrowns = findCard((c) => c.level === 2 && c.crowns === 2 && c.bonus === 'red');
    giveCard(s, 0, twoCrowns.id);
    for (const color of ['blue', 'green', 'black']) giveCard(s, 0, crownCards(color).id);
    s.pub.players[0].royals = ['E1'];
    s.pub.royals = ['E2', 'E3', 'E4'];
    const t = buyNow(s, crownCards('white'));
    expect(t.pub.pending).toEqual([{ kind: 'royal' }]);
  });

  it('applique la capacité de la carte Empereur (vol, Log Pose, rejouer)', () => {
    const steal = newGame();
    steal.pub.pending = [{ kind: 'royal' }];
    setTokens(steal, 1, { black: 1 });
    const a = play(steal, { type: 'chooseRoyal', royalId: 'E2' });
    expect(a.pub.pending).toEqual([{ kind: 'steal' }]);
    expect(play(a, { type: 'steal', color: 'black' }).pub.players[0].tokens.black).toBe(1);

    const privilege = newGame();
    privilege.pub.pending = [{ kind: 'royal' }];
    expect(play(privilege, { type: 'chooseRoyal', royalId: 'E3' }).pub.players[0].privileges).toBe(
      1,
    );

    const extra = newGame();
    extra.pub.pending = [{ kind: 'royal' }];
    expect(play(extra, { type: 'chooseRoyal', royalId: 'E4' }).pub.current).toBe(0);
  });

  it('résout la capacité de la carte avant le choix de la carte Empereur', () => {
    const s = newGame();
    giveCard(s, 0, crownCards('blue').id);
    giveCard(s, 0, crownCards('green').id);
    const jokerWithCrown = findCard((c) => c.bonus === 'joker' && c.crowns === 1 && c.level === 1);
    const t = buyNow(s, jokerWithCrown);
    expect(t.pub.pending).toEqual([
      { kind: 'joker', cardId: jokerWithCrown.id },
      { kind: 'royal' },
    ]);
    expect(validateMove(view(t), { type: 'chooseRoyal', royalId: 'E1' })).toBe('wrong-decision');
    const u = play(t, { type: 'jokerColor', color: 'green' });
    expect(u.pub.pending).toEqual([{ kind: 'royal' }]);
    const w = play(u, { type: 'chooseRoyal', royalId: 'E3' });
    expect(w.pub.players[0].royals).toEqual(['E3']);
    expect(w.pub.current).toBe(1);
  });

  it('ignore la carte Empereur quand il n’en reste plus', () => {
    const s = newGame();
    giveCard(s, 0, crownCards('blue').id);
    giveCard(s, 0, crownCards('green').id);
    s.pub.royals = [];
    const t = buyNow(s, crownCards('white'));
    expect(t.pub.pending).toEqual([]);
    expect(t.pub.current).toBe(1);
  });
});
