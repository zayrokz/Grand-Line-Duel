import { describe, expect, it } from 'vitest';
import { ALL_LINES, cellAt, isStraightLine, placeOnBoard, SPIRAL } from '../src/index.js';
import type { TokenColor } from '../src/index.js';

describe('plateau', () => {
  it('parcourt les 25 cases en spirale depuis le centre', () => {
    expect(SPIRAL).toHaveLength(25);
    expect(new Set(SPIRAL).size).toBe(25);
    expect(SPIRAL[0]).toBe(cellAt(2, 2));
    // Chaque case suivante est voisine orthogonale de la précédente.
    for (let i = 1; i < SPIRAL.length; i++) {
      const a = SPIRAL[i - 1]!;
      const b = SPIRAL[i]!;
      const dist = Math.abs(Math.floor(a / 5) - Math.floor(b / 5)) + Math.abs((a % 5) - (b % 5));
      expect(dist).toBe(1);
    }
  });

  it('reconnaît les lignes, colonnes et diagonales de cases adjacentes', () => {
    expect(isStraightLine([cellAt(0, 0)])).toBe(true);
    expect(isStraightLine([cellAt(1, 1), cellAt(1, 2), cellAt(1, 3)])).toBe(true); // ligne
    expect(isStraightLine([cellAt(0, 4), cellAt(1, 4), cellAt(2, 4)])).toBe(true); // colonne
    expect(isStraightLine([cellAt(0, 0), cellAt(1, 1), cellAt(2, 2)])).toBe(true); // diagonale
    expect(isStraightLine([cellAt(0, 4), cellAt(1, 3), cellAt(2, 2)])).toBe(true); // anti-diagonale
    expect(isStraightLine([cellAt(2, 2), cellAt(1, 2)])).toBe(true); // ordre quelconque
    expect(isStraightLine([cellAt(3, 3), cellAt(4, 4)])).toBe(true); // 2 en diagonale
  });

  it('refuse les cases non adjacentes, coudées, dupliquées ou hors plateau', () => {
    expect(isStraightLine([cellAt(0, 0), cellAt(0, 2)])).toBe(false); // trou
    expect(isStraightLine([cellAt(0, 0), cellAt(0, 1), cellAt(1, 1)])).toBe(false); // coude
    expect(isStraightLine([cellAt(0, 0), cellAt(0, 1), cellAt(0, 3)])).toBe(false);
    expect(isStraightLine([cellAt(0, 4), cellAt(1, 0)])).toBe(false); // retour à la ligne
    expect(isStraightLine([3, 3])).toBe(false);
    expect(isStraightLine([25])).toBe(false);
    expect(isStraightLine([-1])).toBe(false);
    expect(isStraightLine([0, 1, 2, 3])).toBe(false);
    expect(isStraightLine([])).toBe(false);
  });

  it('énumère toutes les lignes géométriques possibles', () => {
    // 25 singletons + 40 paires orthogonales + 32 paires diagonales
    // + 30 triplets orthogonaux + 18 triplets diagonaux.
    expect(ALL_LINES).toHaveLength(25 + 40 + 32 + 30 + 18);
    for (const line of ALL_LINES) expect(isStraightLine(line)).toBe(true);
  });

  it('pose les jetons sur les cases vides dans l’ordre de la spirale', () => {
    const board: (TokenColor | null)[] = Array.from({ length: 25 }, () => 'white');
    board[SPIRAL[3]!] = null;
    board[SPIRAL[0]!] = null;
    board[SPIRAL[20]!] = null;
    placeOnBoard(board, ['red', 'blue']);
    expect(board[SPIRAL[0]!]).toBe('red');
    expect(board[SPIRAL[3]!]).toBe('blue');
    expect(board[SPIRAL[20]!]).toBeNull();
    expect(() => placeOnBoard(board, ['gold', 'gold'])).toThrow();
  });
});
