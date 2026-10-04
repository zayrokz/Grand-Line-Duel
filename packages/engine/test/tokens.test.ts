import { describe, expect, it } from 'vitest';
import { cellAt, getLegalMoves, IllegalMoveError, SPIRAL, validateMove } from '../src/index.js';
import { newGame, play, setBag, setBoard, setTokens, view } from './helpers.js';

const c = cellAt;

describe('action obligatoire : prendre des jetons', () => {
  it('prend jusqu’à 3 jetons adjacents en ligne et passe la main', () => {
    const s = newGame();
    setBoard(s, { [c(0, 0)]: 'white', [c(0, 1)]: 'blue', [c(0, 2)]: 'pearl', [c(4, 4)]: 'gold' });
    const t = play(s, { type: 'takeTokens', cells: [c(0, 0), c(0, 1), c(0, 2)] });
    expect(t.pub.players[0].tokens).toMatchObject({ white: 1, blue: 1, pearl: 1 });
    expect(t.pub.board[c(0, 0)]).toBeNull();
    expect(t.pub.current).toBe(1);
    expect(t.pub.turn).toBe(2);
    // L'état d'origine n'est pas modifié.
    expect(s.pub.board[c(0, 0)]).toBe('white');
  });

  it('autorise 1 ou 2 jetons, y compris en diagonale', () => {
    const s = newGame();
    setBoard(s, { [c(1, 1)]: 'red', [c(2, 2)]: 'green', [c(3, 1)]: 'black' });
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(1, 1), c(2, 2)] })).toBeNull();
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(3, 1)] })).toBeNull();
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(2, 2), c(3, 1)] })).toBeNull();
  });

  it('refuse une case vide entre les jetons ou dans la sélection', () => {
    const s = newGame();
    setBoard(s, { [c(0, 0)]: 'white', [c(0, 2)]: 'blue' });
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(0, 0), c(0, 2)] })).toBe(
      'not-a-line',
    );
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(0, 0), c(0, 1), c(0, 2)] })).toBe(
      'empty-cell',
    );
  });

  it('interdit de prendre de l’Or, même au milieu d’une ligne', () => {
    const s = newGame();
    setBoard(s, { [c(2, 0)]: 'white', [c(2, 1)]: 'gold', [c(2, 2)]: 'blue' });
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(2, 1)] })).toBe('gold-forbidden');
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(2, 0), c(2, 1), c(2, 2)] })).toBe(
      'gold-forbidden',
    );
    expect(validateMove(view(s), { type: 'takeTokens', cells: [c(2, 0), c(2, 2)] })).toBe(
      'not-a-line',
    );
  });

  it('refuse les doublons, les sélections coudées et plus de 3 jetons', () => {
    const s = newGame();
    setBoard(s, { 0: 'white', 1: 'white', 2: 'white', 3: 'white', 6: 'red' });
    expect(validateMove(view(s), { type: 'takeTokens', cells: [0, 0] })).toBe('invalid-cells');
    expect(validateMove(view(s), { type: 'takeTokens', cells: [0, 1, 6] })).toBe('not-a-line');
    expect(validateMove(view(s), { type: 'takeTokens', cells: [0, 1, 2, 3] })).toBe('not-a-line');
    expect(() => play(s, { type: 'takeTokens', cells: [0, 2] })).toThrow(IllegalMoveError);
  });

  it('donne 1 Log Pose à l’adversaire pour 3 jetons de la même couleur', () => {
    const s = newGame();
    setBoard(s, { 0: 'red', 1: 'red', 2: 'red' });
    const t = play(s, { type: 'takeTokens', cells: [0, 1, 2] });
    expect(t.pub.players[1].privileges).toBe(2);
    expect(t.pub.privileges).toBe(1);
  });

  it('donne 1 Log Pose à l’adversaire pour les 2 Fruits du Démon', () => {
    const s = newGame();
    setBoard(s, { 0: 'pearl', 1: 'pearl', 2: 'blue' });
    const t = play(s, { type: 'takeTokens', cells: [0, 1] });
    expect(t.pub.players[1].privileges).toBe(2);
  });

  it('ne donne rien pour 2 jetons identiques ou 3 couleurs mélangées', () => {
    const s = newGame();
    setBoard(s, { 0: 'red', 1: 'red', 2: 'blue' });
    expect(play(s, { type: 'takeTokens', cells: [0, 1] }).pub.players[1].privileges).toBe(1);
    expect(play(s, { type: 'takeTokens', cells: [0, 1, 2] }).pub.players[1].privileges).toBe(1);
  });

  it('ne refuse pas de dépasser 10 jetons : la défausse a lieu en fin de tour', () => {
    const s = newGame();
    setTokens(s, 0, { white: 4, blue: 4, green: 2 });
    setBoard(s, { 0: 'red', 1: 'red', 2: 'black' });
    const t = play(s, { type: 'takeTokens', cells: [0, 1, 2] });
    expect(t.pub.pending).toEqual([{ kind: 'discard', count: 3 }]);
    expect(t.pub.current).toBe(0);
  });
});

describe('action optionnelle : utiliser des Log Pose', () => {
  it('échange N Log Pose contre N jetons au choix, n’importe où sur le plateau', () => {
    const s = newGame();
    s.pub.players[0].privileges = 2;
    s.pub.privileges = 0;
    s.pub.players[1].privileges = 1;
    setBoard(s, { 0: 'pearl', 24: 'black', 12: 'gold' });
    const t = play(s, { type: 'usePrivileges', cells: [0, 24] });
    expect(t.pub.players[0].tokens).toMatchObject({ pearl: 1, black: 1 });
    expect(t.pub.players[0].privileges).toBe(0);
    expect(t.pub.privileges).toBe(2);
    expect(t.pub.current).toBe(0); // le tour continue
    expect(t.pub.flags.usedPrivileges).toBe(true);
  });

  it('interdit l’Or, les cases vides et plus de jetons que de Log Pose', () => {
    const s = newGame();
    s.pub.players[0].privileges = 1;
    setBoard(s, { 0: 'gold', 1: 'red', 2: 'blue' });
    expect(validateMove(view(s), { type: 'usePrivileges', cells: [0] })).toBe('gold-forbidden');
    expect(validateMove(view(s), { type: 'usePrivileges', cells: [5] })).toBe('empty-cell');
    expect(validateMove(view(s), { type: 'usePrivileges', cells: [1, 2] })).toBe(
      'privileges-unavailable',
    );
  });

  it('est impossible sans Log Pose', () => {
    const s = newGame();
    expect(s.pub.players[0].privileges).toBe(0);
    expect(validateMove(view(s), { type: 'usePrivileges', cells: [0] })).toBe(
      'privileges-unavailable',
    );
  });

  it('ne s’utilise qu’une fois par tour et jamais après le remplissage', () => {
    const s = newGame();
    s.pub.players[0].privileges = 3;
    s.pub.privileges = 0;
    s.pub.players[1].privileges = 0;
    setBoard(s, { 0: 'red', 1: 'blue', 2: 'green', 3: 'white' });
    setBag(s, ['black']);
    const t = play(s, { type: 'usePrivileges', cells: [0] });
    expect(validateMove(view(t), { type: 'usePrivileges', cells: [1] })).toBe(
      'privileges-unavailable',
    );
    const u = play(s, { type: 'replenish' });
    expect(validateMove(view(u), { type: 'usePrivileges', cells: [1] })).toBe(
      'privileges-unavailable',
    );
  });
});

describe('action optionnelle : remplir le plateau', () => {
  it('pose tout le sac sur les cases vides en spirale et donne 1 Log Pose à l’adversaire', () => {
    const s = newGame();
    setBoard(s, { [SPIRAL[0]!]: 'white', [SPIRAL[2]!]: 'blue' });
    setBag(s, ['red', 'red', 'pearl']);
    const t = play(s, { type: 'replenish' });
    expect(t.pub.bagCount).toBe(0);
    expect(t.sec.bag).toEqual([]);
    // Les 3 jetons occupent les 3 premières cases vides de la spirale.
    const placed = [SPIRAL[1]!, SPIRAL[3]!, SPIRAL[4]!].map((cell) => t.pub.board[cell]);
    expect([...placed].sort()).toEqual(['pearl', 'red', 'red']);
    expect(t.pub.board[SPIRAL[5]!]).toBeNull();
    expect(t.pub.players[1].privileges).toBe(2);
    expect(t.pub.current).toBe(0);
  });

  it('est impossible si le sac est vide, et une seule fois par tour', () => {
    const s = newGame();
    expect(validateMove(view(s), { type: 'replenish' })).toBe('bag-empty');
    setBoard(s, {});
    setBag(s, ['red']);
    const t = play(s, { type: 'replenish' });
    setBag(t, ['blue']);
    expect(validateMove(view(t), { type: 'replenish' })).toBe('already-replenished');
  });

  it('autorise Log Pose puis remplissage, dans cet ordre', () => {
    const s = newGame();
    s.pub.players[0].privileges = 1;
    s.pub.privileges = 1;
    setBoard(s, { 0: 'red' });
    setBag(s, ['blue']);
    const t = play(play(s, { type: 'usePrivileges', cells: [0] }), { type: 'replenish' });
    expect(t.pub.flags).toMatchObject({ usedPrivileges: true, replenished: true });
  });
});

describe('Log Pose épuisés', () => {
  it('prend le Log Pose à l’adversaire quand la réserve est vide', () => {
    const s = newGame();
    s.pub.privileges = 0;
    s.pub.players[0].privileges = 2;
    s.pub.players[1].privileges = 1;
    setBoard(s, { 0: 'red', 1: 'red', 2: 'red' });
    // Le joueur 0 prend 3 rouges : le joueur 1 gagne un Log Pose, pris au joueur 0.
    const t = play(s, { type: 'takeTokens', cells: [0, 1, 2] });
    expect(t.pub.players[1].privileges).toBe(2);
    expect(t.pub.players[0].privileges).toBe(1);
    expect(t.pub.log).toContainEqual({ t: 'gainPrivilege', p: 1, from: 'opponent' });
  });

  it('ne fait rien si le bénéficiaire possède déjà les 3 Log Pose', () => {
    const s = newGame();
    s.pub.privileges = 0;
    s.pub.players[0].privileges = 0;
    s.pub.players[1].privileges = 3;
    setBoard(s, { 0: 'red', 1: 'red', 2: 'red' });
    const t = play(s, { type: 'takeTokens', cells: [0, 1, 2] });
    expect(t.pub.players[1].privileges).toBe(3);
    expect(t.pub.privileges + t.pub.players[0].privileges + t.pub.players[1].privileges).toBe(3);
  });
});

describe('coup de secours', () => {
  it('« passer » n’est légal que sans aucune action obligatoire ni remplissage possible', () => {
    const s = newGame();
    expect(validateMove(view(s), { type: 'pass' })).toBe('pass-not-allowed');
    setBoard(s, { 0: 'gold' });
    s.pub.players[0].reservedLevels = [1, 1, 1];
    s.sec.reserved[0] = [];
    expect(getLegalMoves(view(s))).toEqual([{ type: 'pass' }]);
    const t = play(s, { type: 'pass' });
    expect(t.pub.current).toBe(1);
  });
});
