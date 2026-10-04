import type { TokenColor } from './types.js';

export const BOARD_SIZE = 5;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export const rowOf = (cell: number): number => Math.floor(cell / BOARD_SIZE);
export const colOf = (cell: number): number => cell % BOARD_SIZE;
export const cellAt = (row: number, col: number): number => row * BOARD_SIZE + col;

/**
 * Ordre de remplissage en spirale : case centrale puis vers la droite, le bas, la gauche
 * et le haut (longueurs de pas 1, 1, 2, 2, 3, 3, 4, 4, 4).
 */
export const SPIRAL: readonly number[] = (() => {
  const order: number[] = [];
  let row = 2;
  let col = 2;
  order.push(cellAt(row, col));
  const dirs = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ] as const;
  let d = 0;
  let step = 1;
  while (order.length < CELL_COUNT) {
    for (let rep = 0; rep < 2 && order.length < CELL_COUNT; rep++) {
      const [dr, dc] = dirs[d % 4]!;
      for (let s = 0; s < step && order.length < CELL_COUNT; s++) {
        row += dr;
        col += dc;
        order.push(cellAt(row, col));
      }
      d++;
    }
    step++;
  }
  return order;
})();

export function isValidCell(cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < CELL_COUNT;
}

/**
 * Vrai si les cases (1 à 3, distinctes) forment une suite de cases adjacentes en ligne droite :
 * ligne, colonne ou diagonale. Ne regarde pas le contenu des cases.
 */
export function isStraightLine(cells: readonly number[]): boolean {
  if (cells.length < 1 || cells.length > 3) return false;
  if (!cells.every(isValidCell)) return false;
  if (new Set(cells).size !== cells.length) return false;
  if (cells.length === 1) return true;
  const sorted = [...cells].sort((a, b) => a - b);
  const dr = rowOf(sorted[1]!) - rowOf(sorted[0]!);
  const dc = colOf(sorted[1]!) - colOf(sorted[0]!);
  if (Math.abs(dr) > 1 || Math.abs(dc) > 1) return false;
  for (let i = 2; i < sorted.length; i++) {
    if (rowOf(sorted[i]!) - rowOf(sorted[i - 1]!) !== dr) return false;
    if (colOf(sorted[i]!) - colOf(sorted[i - 1]!) !== dc) return false;
  }
  return true;
}

/** Toutes les lignes possibles de 1 à 3 cases sur un plateau 5×5 (géométrie seule). */
export const ALL_LINES: readonly (readonly number[])[] = (() => {
  const lines: number[][] = [];
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    lines.push([cell]);
    for (const [dr, dc] of dirs) {
      for (const len of [2, 3]) {
        const line: number[] = [];
        for (let k = 0; k < len; k++) {
          const r = rowOf(cell) + dr * k;
          const c = colOf(cell) + dc * k;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          line.push(cellAt(r, c));
        }
        if (line.length === len) lines.push(line);
      }
    }
  }
  return lines;
})();

/** Pose les jetons un par un sur les cases vides en suivant la spirale. Mute `board`. */
export function placeOnBoard(board: (TokenColor | null)[], tokens: readonly TokenColor[]): void {
  let i = 0;
  for (const cell of SPIRAL) {
    if (i >= tokens.length) break;
    if (board[cell] === null) {
      board[cell] = tokens[i]!;
      i++;
    }
  }
  if (i < tokens.length) throw new Error('Plus de jetons que de cases vides sur le plateau');
}
