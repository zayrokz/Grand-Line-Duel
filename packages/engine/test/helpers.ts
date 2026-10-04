import {
  applyMove,
  CARDS,
  createGame,
  emptyTokens,
  getCard,
  LEVELS,
  toPlayerView,
} from '../src/index.js';
import type {
  CardDef,
  GameState,
  GemColor,
  Move,
  PlayerView,
  Seat,
  TokenColor,
  TokenCounts,
} from '../src/index.js';

/** Partie neuve, premier joueur imposé (siège 0 par défaut). */
export function newGame(seed = 42, first: Seat = 0): GameState {
  return createGame(seed, first);
}

export function view(s: GameState, seat: Seat = s.pub.current): PlayerView {
  return toPlayerView(s, seat);
}

export function play(s: GameState, move: Move, seat: Seat = s.pub.current): GameState {
  return applyMove(s, seat, move);
}

/** Remplace le plateau. Les jetons retirés ne sont pas conservés (scénarios ciblés). */
export function setBoard(s: GameState, cells: Partial<Record<number, TokenColor>>): void {
  s.pub.board = Array.from({ length: 25 }, (_, i) => cells[i] ?? null);
}

export function setTokens(s: GameState, seat: Seat, tokens: Partial<TokenCounts>): void {
  s.pub.players[seat].tokens = { ...emptyTokens(), ...tokens };
}

export function setBag(s: GameState, bag: TokenColor[]): void {
  s.sec.bag = [...bag];
  s.pub.bagCount = bag.length;
}

export function findCard(predicate: (card: CardDef) => boolean): CardDef {
  const card = CARDS.find(predicate);
  if (!card) throw new Error('Aucune carte ne correspond');
  return card;
}

/** Retire une carte des paquets et de la pyramide, où qu'elle soit. */
function detach(s: GameState, cardId: string): void {
  for (const level of LEVELS) {
    s.sec.decks[level] = s.sec.decks[level].filter((id) => id !== cardId);
    s.pub.deckCounts[level] = s.sec.decks[level].length;
    s.pub.pyramid[level] = s.pub.pyramid[level].map((id) => (id === cardId ? null : id));
  }
}

/** Place une carte dans la pyramide (premier emplacement de son niveau) et la renvoie. */
export function putInPyramid(s: GameState, cardId: string): void {
  detach(s, cardId);
  const level = getCard(cardId).level;
  const previous = s.pub.pyramid[level][0];
  if (previous && previous !== cardId) s.sec.decks[level].push(previous);
  s.pub.pyramid[level][0] = cardId;
  s.pub.deckCounts[level] = s.sec.decks[level].length;
}

/** Donne une carte achetée à un joueur (couleur de joker éventuellement imposée). */
export function giveCard(s: GameState, seat: Seat, cardId: string, color?: GemColor): void {
  detach(s, cardId);
  const card = getCard(cardId);
  const resolved = card.bonus === 'joker' ? (color ?? null) : card.bonus;
  s.pub.players[seat].cards.push({ id: cardId, color: resolved });
}

/** Ajoute une carte à la réserve d'un joueur. */
export function giveReserved(s: GameState, seat: Seat, cardId: string): void {
  detach(s, cardId);
  s.sec.reserved[seat].push(cardId);
  s.pub.players[seat].reservedLevels.push(getCard(cardId).level);
}

export const cellsOf = (s: GameState, token: TokenColor): number[] =>
  s.pub.board.flatMap((t, i) => (t === token ? [i] : []));
