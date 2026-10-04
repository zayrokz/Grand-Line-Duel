import { ALL_LINES, CELL_COUNT, isStraightLine, isValidCell } from './board.js';
import { getCard, isCardId, isJoker } from './cards.js';
import {
  bonuses,
  canBuyCard,
  computePayment,
  hasColoredBonus,
  MAX_RESERVED,
  tokenTotal,
} from './player.js';
import { GEM_COLORS, LEVELS, TAKEABLE_COLORS, TOKEN_COLORS } from './types.js';
import type {
  GemColor,
  Level,
  Move,
  Pending,
  PlayerState,
  PlayerView,
  PublicState,
  Seat,
  TakeableColor,
} from './types.js';

export type IllegalReason =
  | 'game-over'
  | 'not-your-turn'
  | 'decision-pending'
  | 'wrong-decision'
  | 'privileges-unavailable'
  | 'invalid-cells'
  | 'empty-cell'
  | 'gold-forbidden'
  | 'not-a-line'
  | 'already-replenished'
  | 'bag-empty'
  | 'reserve-limit'
  | 'gold-required'
  | 'card-unavailable'
  | 'deck-empty'
  | 'cannot-afford'
  | 'joker-needs-bonus'
  | 'invalid-color'
  | 'invalid-royal'
  | 'invalid-discard'
  | 'pass-not-allowed';

export const opponentOf = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** Position d'une carte visible dans la pyramide, ou `null`. */
export function findInPyramid(
  pub: PublicState,
  cardId: string,
): { level: Level; index: number } | null {
  for (const level of LEVELS) {
    const index = pub.pyramid[level].indexOf(cardId);
    if (index !== -1) return { level, index };
  }
  return null;
}

const isTakeable = (token: unknown): token is TakeableColor =>
  typeof token === 'string' && token !== 'gold' && (TAKEABLE_COLORS as string[]).includes(token);

function distinctCells(cells: readonly number[]): boolean {
  return cells.every(isValidCell) && new Set(cells).size === cells.length;
}

/** Options d'une décision en attente (utilisées par la validation, l'interface et les tests). */
export function jokerOptions(player: PlayerState, cardId: string): GemColor[] {
  const others: PlayerState = { ...player, cards: player.cards.filter((c) => c.id !== cardId) };
  const bonus = bonuses(others);
  return GEM_COLORS.filter((color) => bonus[color] > 0);
}

export function abilityTokenOptions(pub: PublicState, color: GemColor): number[] {
  const cells: number[] = [];
  pub.board.forEach((token, cell) => {
    if (token === color) cells.push(cell);
  });
  return cells;
}

export function stealOptions(opponent: PlayerState): TakeableColor[] {
  return TAKEABLE_COLORS.filter((color) => opponent.tokens[color] > 0);
}

/** Vrai si la décision n'offre aucun choix possible (elle est alors ignorée). */
export function isPendingVoid(pub: PublicState, pending: Pending): boolean {
  const player = pub.players[pub.current];
  switch (pending.kind) {
    case 'joker':
      return jokerOptions(player, pending.cardId).length === 0;
    case 'token':
      return abilityTokenOptions(pub, pending.color).length === 0;
    case 'steal':
      return stealOptions(pub.players[opponentOf(pub.current)]).length === 0;
    case 'royal':
      return pub.royals.length === 0;
    case 'discard':
      return pending.count <= 0;
  }
}

function validateTakeCells(pub: PublicState, cells: readonly number[]): IllegalReason | null {
  if (!distinctCells(cells)) return 'invalid-cells';
  for (const cell of cells) {
    const token = pub.board[cell];
    if (token === null || token === undefined) return 'empty-cell';
    if (token === 'gold') return 'gold-forbidden';
  }
  return null;
}

function canReplenish(pub: PublicState): boolean {
  return !pub.flags.replenished && pub.bagCount > 0;
}

function canUsePrivileges(pub: PublicState, player: PlayerState): boolean {
  return !pub.flags.usedPrivileges && !pub.flags.replenished && player.privileges > 0;
}

function canReserveAnything(pub: PublicState, player: PlayerState): boolean {
  if (player.reservedLevels.length >= MAX_RESERVED) return false;
  if (!pub.board.includes('gold')) return false;
  return LEVELS.some(
    (level) => pub.deckCounts[level] > 0 || pub.pyramid[level].some((id) => id !== null),
  );
}

/** Vrai si au moins une action obligatoire est possible. */
export function hasMandatoryAction(view: PlayerView): boolean {
  const { pub } = view;
  const player = pub.players[view.seat];
  if (pub.board.some(isTakeable)) return true;
  if (canReserveAnything(pub, player)) return true;
  const candidates = [
    ...LEVELS.flatMap((level) => pub.pyramid[level]).filter((id): id is string => id !== null),
    ...view.reserved,
  ];
  return candidates.some((id) => canBuyCard(getCard(id), player));
}

/**
 * Vérifie la légalité d'un coup du point de vue du joueur `view.seat`.
 * Renvoie `null` si le coup est légal, sinon la raison du refus.
 */
export function validateMove(view: PlayerView, move: Move): IllegalReason | null {
  const { pub, seat } = view;
  if (pub.winner !== null) return 'game-over';
  if (pub.current !== seat) return 'not-your-turn';
  const player = pub.players[seat];
  const head = pub.pending[0];

  const decisionMoves: Move['type'][] = [
    'jokerColor',
    'abilityToken',
    'steal',
    'chooseRoyal',
    'discard',
  ];
  if (head && !decisionMoves.includes(move.type)) return 'decision-pending';
  if (!head && decisionMoves.includes(move.type)) return 'wrong-decision';

  switch (move.type) {
    case 'usePrivileges': {
      if (!canUsePrivileges(pub, player)) return 'privileges-unavailable';
      if (move.cells.length < 1 || move.cells.length > player.privileges) {
        return 'privileges-unavailable';
      }
      return validateTakeCells(pub, move.cells);
    }
    case 'replenish': {
      if (pub.flags.replenished) return 'already-replenished';
      if (pub.bagCount === 0) return 'bag-empty';
      return null;
    }
    case 'takeTokens': {
      const reason = validateTakeCells(pub, move.cells);
      if (reason) return reason;
      return isStraightLine(move.cells) ? null : 'not-a-line';
    }
    case 'reserve':
    case 'reserveDeck': {
      if (player.reservedLevels.length >= MAX_RESERVED) return 'reserve-limit';
      if (!isValidCell(move.goldCell) || pub.board[move.goldCell] !== 'gold') {
        return 'gold-required';
      }
      if (move.type === 'reserve') {
        return findInPyramid(pub, move.cardId) ? null : 'card-unavailable';
      }
      return pub.deckCounts[move.level] > 0 ? null : 'deck-empty';
    }
    case 'buy': {
      if (!isCardId(move.cardId)) return 'card-unavailable';
      const available =
        findInPyramid(pub, move.cardId) !== null || view.reserved.includes(move.cardId);
      if (!available) return 'card-unavailable';
      const card = getCard(move.cardId);
      if (isJoker(card) && !hasColoredBonus(player)) return 'joker-needs-bonus';
      return computePayment(card, player) ? null : 'cannot-afford';
    }
    case 'jokerColor': {
      if (head?.kind !== 'joker') return 'wrong-decision';
      return jokerOptions(player, head.cardId).includes(move.color) ? null : 'invalid-color';
    }
    case 'abilityToken': {
      if (head?.kind !== 'token') return 'wrong-decision';
      if (!isValidCell(move.cell)) return 'invalid-cells';
      return pub.board[move.cell] === head.color ? null : 'invalid-cells';
    }
    case 'steal': {
      if (head?.kind !== 'steal') return 'wrong-decision';
      return stealOptions(pub.players[opponentOf(seat)]).includes(move.color)
        ? null
        : 'invalid-color';
    }
    case 'chooseRoyal': {
      if (head?.kind !== 'royal') return 'wrong-decision';
      return pub.royals.includes(move.royalId) ? null : 'invalid-royal';
    }
    case 'discard': {
      if (head?.kind !== 'discard') return 'wrong-decision';
      let total = 0;
      for (const [color, n] of Object.entries(move.tokens)) {
        if (!(TOKEN_COLORS as string[]).includes(color)) return 'invalid-discard';
        if (!Number.isInteger(n) || (n as number) < 0) return 'invalid-discard';
        if ((n as number) > player.tokens[color as keyof typeof player.tokens]) {
          return 'invalid-discard';
        }
        total += n as number;
      }
      return total === head.count ? null : 'invalid-discard';
    }
    case 'pass': {
      if (canReplenish(pub) || hasMandatoryAction(view)) return 'pass-not-allowed';
      return null;
    }
  }
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]];
  const result: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), size - 1)) result.push([item, ...rest]);
  });
  return result;
}

/** Toutes les façons de rendre `count` jetons parmi ceux possédés. */
function discardOptions(player: PlayerState, count: number): Move[] {
  const moves: Move[] = [];
  const colors = TOKEN_COLORS.filter((c) => player.tokens[c] > 0);
  const walk = (index: number, remaining: number, acc: Partial<Record<string, number>>) => {
    if (remaining === 0) {
      moves.push({ type: 'discard', tokens: { ...acc } });
      return;
    }
    if (index >= colors.length) return;
    const color = colors[index]!;
    for (let n = Math.min(remaining, player.tokens[color]); n >= 0; n--) {
      const next = { ...acc };
      if (n > 0) next[color] = n;
      walk(index + 1, remaining - n, next);
    }
  };
  walk(0, count, {});
  return moves;
}

/** Énumère tous les coups légaux du joueur `view.seat` (vide si ce n'est pas son tour). */
export function getLegalMoves(view: PlayerView): Move[] {
  const { pub, seat } = view;
  if (pub.winner !== null || pub.current !== seat) return [];
  const player = pub.players[seat];
  const head = pub.pending[0];

  if (head) {
    switch (head.kind) {
      case 'joker':
        return jokerOptions(player, head.cardId).map((color) => ({ type: 'jokerColor', color }));
      case 'token':
        return abilityTokenOptions(pub, head.color).map((cell) => ({ type: 'abilityToken', cell }));
      case 'steal':
        return stealOptions(pub.players[opponentOf(seat)]).map((color) => ({
          type: 'steal',
          color,
        }));
      case 'royal':
        return pub.royals.map((royalId) => ({ type: 'chooseRoyal', royalId }));
      case 'discard':
        return discardOptions(player, head.count);
    }
  }

  const moves: Move[] = [];
  const takeableCells = [...Array(CELL_COUNT).keys()].filter((cell) => isTakeable(pub.board[cell]));

  if (canUsePrivileges(pub, player)) {
    for (let n = 1; n <= Math.min(player.privileges, takeableCells.length); n++) {
      for (const cells of combinations(takeableCells, n))
        moves.push({ type: 'usePrivileges', cells });
    }
  }
  if (canReplenish(pub)) moves.push({ type: 'replenish' });

  for (const line of ALL_LINES) {
    if (line.every((cell) => isTakeable(pub.board[cell]))) {
      moves.push({ type: 'takeTokens', cells: [...line] });
    }
  }

  if (player.reservedLevels.length < MAX_RESERVED) {
    const goldCells = [...Array(CELL_COUNT).keys()].filter((cell) => pub.board[cell] === 'gold');
    for (const goldCell of goldCells) {
      for (const level of LEVELS) {
        for (const cardId of pub.pyramid[level]) {
          if (cardId) moves.push({ type: 'reserve', goldCell, cardId });
        }
        if (pub.deckCounts[level] > 0) moves.push({ type: 'reserveDeck', goldCell, level });
      }
    }
  }

  const buyable = [
    ...LEVELS.flatMap((level) => pub.pyramid[level]).filter((id): id is string => id !== null),
    ...view.reserved,
  ];
  for (const cardId of buyable) {
    if (canBuyCard(getCard(cardId), player)) moves.push({ type: 'buy', cardId });
  }

  // Coup de secours : aucune action obligatoire possible et plateau impossible à remplir.
  if (!canReplenish(pub) && !hasMandatoryAction(view)) moves.push({ type: 'pass' });
  return moves;
}

/** Total des jetons d'un joueur (Gemmes, Or et Perles confondus). */
export function playerTokenCount(player: PlayerState): number {
  return tokenTotal(player.tokens);
}
