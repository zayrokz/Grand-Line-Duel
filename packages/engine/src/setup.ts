import { PYRAMID_SIZE, cardsOfLevel } from './cards.js';
import { CELL_COUNT, placeOnBoard } from './board.js';
import { emptyTokens, TOTAL_PRIVILEGES } from './player.js';
import { nextRandom, shuffle } from './rng.js';
import type { RngState } from './rng.js';
import { GEM_COLORS, LEVELS } from './types.js';
import type { GameState, Level, PlayerState, Seat, TokenColor } from './types.js';

export const INITIAL_TOKENS: readonly TokenColor[] = [
  ...GEM_COLORS.flatMap((color) => [color, color, color, color]),
  'pearl',
  'pearl',
  'gold',
  'gold',
  'gold',
];

function newPlayer(): PlayerState {
  return { tokens: emptyTokens(), privileges: 0, cards: [], royals: [], reservedLevels: [] };
}

/**
 * Mise en place d'une partie à partir d'une graine secrète (64 caractères hexadécimaux tirés par
 * le serveur). Le premier joueur est tiré avec la graine sauf s'il est imposé (tests). Son
 * adversaire reçoit 1 Log Pose.
 */
export function createGame(seed: string, first?: Seat): GameState {
  if (seed.length === 0) throw new Error('Graine vide');
  let rng: RngState = { seed, counter: 0 };
  let firstSeat: Seat;
  if (first === undefined) {
    const [r, next] = nextRandom(rng);
    rng = next;
    firstSeat = r < 0.5 ? 0 : 1;
  } else {
    firstSeat = first;
  }

  const pyramid = {} as Record<Level, (string | null)[]>;
  const decks = {} as Record<Level, string[]>;
  for (const level of LEVELS) {
    const [ids, next] = shuffle(
      cardsOfLevel(level).map((c) => c.id),
      rng,
    );
    rng = next;
    pyramid[level] = ids.slice(0, PYRAMID_SIZE[level]);
    decks[level] = ids.slice(PYRAMID_SIZE[level]);
  }

  const [tokens, afterTokens] = shuffle(INITIAL_TOKENS, rng);
  rng = afterTokens;
  const board: (TokenColor | null)[] = Array.from({ length: CELL_COUNT }, () => null);
  placeOnBoard(board, tokens);

  const second: Seat = firstSeat === 0 ? 1 : 0;
  const players: [PlayerState, PlayerState] = [newPlayer(), newPlayer()];
  players[second].privileges = 1;

  return {
    pub: {
      turn: 1,
      current: firstSeat,
      flags: { usedPrivileges: false, replenished: false, extraTurn: false },
      pending: [],
      board,
      bagCount: 0,
      privileges: TOTAL_PRIVILEGES - 1,
      pyramid,
      deckCounts: { 1: decks[1].length, 2: decks[2].length, 3: decks[3].length },
      royals: ['E1', 'E2', 'E3', 'E4'],
      players,
      winner: null,
      winReason: null,
      log: [
        { t: 'start', first: firstSeat },
        { t: 'gainPrivilege', p: second, from: 'supply' },
        { t: 'turn', p: firstSeat, extra: false },
      ],
    },
    sec: { rng, decks, bag: [], reserved: { 0: [], 1: [] } },
  };
}
