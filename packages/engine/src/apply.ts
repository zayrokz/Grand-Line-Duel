import { placeOnBoard } from './board.js';
import { getCard, getRoyal } from './cards.js';
import {
  computePayment,
  CROWN_THRESHOLDS,
  crowns,
  MAX_TOKENS,
  pointsByColor,
  removeTokens,
  tokensToList,
  tokenTotal,
  totalPoints,
  WIN_COLOR_POINTS,
  WIN_CROWNS,
  WIN_POINTS,
} from './player.js';
import { shuffle } from './rng.js';
import { findInPyramid, isPendingVoid, opponentOf, validateMove } from './rules.js';
import type { IllegalReason } from './rules.js';
import { GEM_COLORS } from './types.js';
import type {
  GameState,
  Level,
  LogEntry,
  Move,
  Pending,
  PlayerState,
  PublicState,
  Seat,
  TakeableColor,
  WinReason,
} from './types.js';

export const MAX_LOG_ENTRIES = 300;

export class IllegalMoveError extends Error {
  constructor(public readonly reason: IllegalReason) {
    super(`Coup illégal : ${reason}`);
    this.name = 'IllegalMoveError';
  }
}

function log(s: GameState, entry: LogEntry): void {
  s.pub.log.push(entry);
  if (s.pub.log.length > MAX_LOG_ENTRIES) s.pub.log.splice(0, s.pub.log.length - MAX_LOG_ENTRIES);
}

/** Le joueur gagne 1 Log Pose : de la réserve, sinon de l'adversaire, sinon rien. */
function gainPrivilege(s: GameState, seat: Seat): void {
  const player = s.pub.players[seat];
  const opponent = s.pub.players[opponentOf(seat)];
  if (s.pub.privileges > 0) {
    s.pub.privileges--;
    player.privileges++;
    log(s, { t: 'gainPrivilege', p: seat, from: 'supply' });
  } else if (opponent.privileges > 0) {
    opponent.privileges--;
    player.privileges++;
    log(s, { t: 'gainPrivilege', p: seat, from: 'opponent' });
  }
}

function takeFromBoard(s: GameState, seat: Seat, cells: readonly number[]): TakeableColor[] {
  const taken: TakeableColor[] = [];
  for (const cell of cells) {
    const token = s.pub.board[cell];
    if (token === null || token === undefined || token === 'gold') {
      throw new Error(`Case ${cell} invalide`);
    }
    s.pub.board[cell] = null;
    s.pub.players[seat].tokens[token]++;
    taken.push(token);
  }
  return taken;
}

function takeGold(s: GameState, seat: Seat, cell: number): void {
  if (s.pub.board[cell] !== 'gold') throw new Error(`Pas d'Or en case ${cell}`);
  s.pub.board[cell] = null;
  s.pub.players[seat].tokens.gold++;
}

/** Remplace une carte de la pyramide par la carte du dessus du paquet du même niveau. */
function refillPyramid(s: GameState, level: Level, index: number): void {
  const next = s.sec.decks[level].shift();
  s.pub.pyramid[level][index] = next ?? null;
  s.pub.deckCounts[level] = s.sec.decks[level].length;
}

function returnToBag(s: GameState, tokens: Parameters<typeof tokensToList>[0]): void {
  s.sec.bag.push(...tokensToList(tokens));
  s.pub.bagCount = s.sec.bag.length;
}

export function victoryReason(player: PlayerState): WinReason | null {
  if (totalPoints(player) >= WIN_POINTS) return 'points';
  if (crowns(player) >= WIN_CROWNS) return 'crowns';
  const byColor = pointsByColor(player);
  if (GEM_COLORS.some((color) => byColor[color] >= WIN_COLOR_POINTS)) return 'color';
  return null;
}

function startNextTurn(s: GameState): void {
  const extra = s.pub.flags.extraTurn;
  if (!extra) s.pub.current = opponentOf(s.pub.current);
  s.pub.turn++;
  s.pub.flags = { usedPrivileges: false, replenished: false, extraTurn: false };
  log(s, { t: 'turn', p: s.pub.current, extra });
}

/**
 * Résout la file des décisions puis termine le tour : défausse au-delà de 10 jetons,
 * vérification de la victoire, puis tour suivant (ou tour supplémentaire).
 */
function advance(s: GameState): void {
  const { pub } = s;
  while (pub.pending.length > 0 && isPendingVoid(pub, pub.pending[0]!)) pub.pending.shift();
  if (pub.pending.length > 0) return;

  const player = pub.players[pub.current];
  const excess = tokenTotal(player.tokens) - MAX_TOKENS;
  if (excess > 0) {
    pub.pending.push({ kind: 'discard', count: excess });
    return;
  }

  const reason = victoryReason(player);
  if (reason) {
    pub.winner = pub.current;
    pub.winReason = reason;
    log(s, { t: 'end', winner: pub.current, reason });
    return;
  }
  startNextTurn(s);
}

function buy(s: GameState, seat: Seat, cardId: string): void {
  const { pub, sec } = s;
  const player = pub.players[seat];
  const card = getCard(cardId);
  const payment = computePayment(card, player);
  if (!payment) throw new Error('Paiement impossible');

  removeTokens(player.tokens, payment);
  returnToBag(s, payment);

  const position = findInPyramid(pub, cardId);
  if (position) {
    refillPyramid(s, position.level, position.index);
  } else {
    const index = sec.reserved[seat].indexOf(cardId);
    if (index === -1) throw new Error('Carte introuvable');
    sec.reserved[seat].splice(index, 1);
    player.reservedLevels.splice(index, 1);
  }

  const crownsBefore = crowns(player);
  player.cards.push({ id: cardId, color: card.bonus === 'joker' ? null : card.bonus });
  log(s, { t: 'buy', p: seat, card: cardId, paid: payment, fromReserve: position === null });

  // Capacités dans l'ordre du fichier de données (ex. L3-12 : association puis rejouer).
  for (const ability of card.abilities) {
    switch (ability) {
      case 'associate':
        pub.pending.push({ kind: 'joker', cardId });
        break;
      case 'extra_turn':
        pub.flags.extraTurn = true;
        break;
      case 'take_privilege':
        gainPrivilege(s, seat);
        break;
      case 'take_token':
        if (card.bonus && card.bonus !== 'joker') {
          pub.pending.push({ kind: 'token', color: card.bonus });
        }
        break;
      case 'steal_token':
        pub.pending.push({ kind: 'steal' });
        break;
    }
  }

  const crownsAfter = crowns(player);
  for (const threshold of CROWN_THRESHOLDS) {
    if (crownsBefore < threshold && crownsAfter >= threshold) pub.pending.push({ kind: 'royal' });
  }
}

/**
 * Applique un coup légal du joueur `seat` et renvoie le nouvel état (l'état d'entrée n'est
 * jamais modifié). Lève `IllegalMoveError` si le coup est illégal.
 */
export function applyMove(state: GameState, seat: Seat, move: Move): GameState {
  const reason = validateMove({ pub: state.pub, seat, reserved: state.sec.reserved[seat] }, move);
  if (reason) throw new IllegalMoveError(reason);

  const s = structuredClone(state);
  const { pub, sec } = s;
  const player = pub.players[seat];
  const opponent = opponentOf(seat);

  switch (move.type) {
    case 'usePrivileges': {
      const tokens = takeFromBoard(s, seat, move.cells);
      player.privileges -= move.cells.length;
      pub.privileges += move.cells.length;
      pub.flags.usedPrivileges = true;
      log(s, { t: 'privileges', p: seat, tokens });
      return s;
    }
    case 'replenish': {
      const [drawn, rng] = shuffle(sec.bag, sec.rng);
      sec.rng = rng;
      placeOnBoard(pub.board, drawn);
      sec.bag = [];
      pub.bagCount = 0;
      pub.flags.replenished = true;
      log(s, { t: 'replenish', p: seat, count: drawn.length });
      gainPrivilege(s, opponent);
      return s;
    }
    case 'takeTokens': {
      const tokens = takeFromBoard(s, seat, move.cells);
      log(s, { t: 'take', p: seat, tokens });
      const sameColor = tokens.length === 3 && tokens.every((t) => t === tokens[0]);
      const pearls = tokens.filter((t) => t === 'pearl').length;
      if (sameColor || pearls >= 2) gainPrivilege(s, opponent);
      advance(s);
      return s;
    }
    case 'reserve':
    case 'reserveDeck': {
      takeGold(s, seat, move.goldCell);
      let cardId: string;
      let level: Level;
      if (move.type === 'reserve') {
        const position = findInPyramid(pub, move.cardId);
        if (!position) throw new Error('Carte introuvable');
        cardId = move.cardId;
        level = position.level;
        refillPyramid(s, position.level, position.index);
      } else {
        const top = sec.decks[move.level].shift();
        if (!top) throw new Error('Paquet vide');
        cardId = top;
        level = move.level;
        pub.deckCounts[level] = sec.decks[level].length;
      }
      sec.reserved[seat].push(cardId);
      player.reservedLevels.push(level);
      log(s, { t: 'reserve', p: seat, level, from: move.type === 'reserve' ? 'pyramid' : 'deck' });
      advance(s);
      return s;
    }
    case 'buy': {
      buy(s, seat, move.cardId);
      advance(s);
      return s;
    }
    case 'jokerColor': {
      const head = pub.pending.shift();
      if (head?.kind !== 'joker') throw new Error('Décision inattendue');
      const owned = player.cards.find((c) => c.id === head.cardId);
      if (!owned) throw new Error('Carte joker introuvable');
      owned.color = move.color;
      log(s, { t: 'joker', p: seat, card: head.cardId, color: move.color });
      advance(s);
      return s;
    }
    case 'abilityToken': {
      const head = pub.pending.shift();
      if (head?.kind !== 'token') throw new Error('Décision inattendue');
      takeFromBoard(s, seat, [move.cell]);
      log(s, { t: 'abilityToken', p: seat, color: head.color });
      advance(s);
      return s;
    }
    case 'steal': {
      pub.pending.shift();
      pub.players[opponent].tokens[move.color]--;
      player.tokens[move.color]++;
      log(s, { t: 'steal', p: seat, color: move.color });
      advance(s);
      return s;
    }
    case 'chooseRoyal': {
      pub.pending.shift();
      pub.royals = pub.royals.filter((id) => id !== move.royalId);
      player.royals.push(move.royalId);
      log(s, { t: 'royal', p: seat, royal: move.royalId });
      // Les décisions de la carte Royale passent avant les éventuelles suivantes de la file.
      const royalDecisions: Pending[] = [];
      for (const ability of getRoyal(move.royalId).abilities) {
        switch (ability) {
          case 'extra_turn':
            pub.flags.extraTurn = true;
            break;
          case 'take_privilege':
            gainPrivilege(s, seat);
            break;
          case 'steal_token':
            royalDecisions.push({ kind: 'steal' });
            break;
        }
      }
      pub.pending.unshift(...royalDecisions);
      advance(s);
      return s;
    }
    case 'discard': {
      pub.pending.shift();
      removeTokens(player.tokens, move.tokens);
      returnToBag(s, move.tokens);
      log(s, { t: 'discard', p: seat, tokens: move.tokens });
      advance(s);
      return s;
    }
    case 'pass': {
      log(s, { t: 'pass', p: seat });
      advance(s);
      return s;
    }
  }
}

/** Fin de partie par abandon ou dépassement du délai : l'adversaire du perdant gagne. */
export function forfeit(pub: PublicState, loser: Seat, reason: 'resign' | 'timeout'): PublicState {
  if (pub.winner !== null) return pub;
  const next = structuredClone(pub);
  const winner = opponentOf(loser);
  next.winner = winner;
  next.winReason = reason;
  next.pending = [];
  next.log.push({ t: 'end', winner, reason });
  if (next.log.length > MAX_LOG_ENTRIES) next.log.splice(0, next.log.length - MAX_LOG_ENTRIES);
  return next;
}
