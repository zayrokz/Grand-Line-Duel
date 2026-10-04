import { describe, expect, it } from 'vitest';
import {
  applyMove,
  createGame,
  getLegalMoves,
  LEVELS,
  nextRandom,
  parseMove,
  tokenTotal,
  toPlayerView,
  TOKEN_COLORS,
  validateMove,
} from '../src/index.js';
import type { GameState, Move, RngState } from '../src/index.js';

function checkInvariants(s: GameState): void {
  const { pub, sec } = s;
  // 25 jetons : plateau + sac + joueurs, par couleur.
  const counts = Object.fromEntries(TOKEN_COLORS.map((c) => [c, 0])) as Record<string, number>;
  for (const token of pub.board) if (token) counts[token]!++;
  for (const token of sec.bag) counts[token]!++;
  for (const p of pub.players) for (const c of TOKEN_COLORS) counts[c]! += p.tokens[c];
  expect(counts).toEqual({ white: 4, blue: 4, green: 4, red: 4, black: 4, pearl: 2, gold: 3 });
  expect(pub.bagCount).toBe(sec.bag.length);

  // 3 Log Pose.
  expect(pub.privileges + pub.players[0].privileges + pub.players[1].privileges).toBe(3);

  // 67 cartes, chacune à un seul endroit.
  const all = [
    ...LEVELS.flatMap((l) => pub.pyramid[l]).filter((id) => id !== null),
    ...LEVELS.flatMap((l) => sec.decks[l]),
    ...sec.reserved[0],
    ...sec.reserved[1],
    ...pub.players.flatMap((p) => p.cards.map((c) => c.id)),
  ];
  expect(all).toHaveLength(67);
  expect(new Set(all).size).toBe(67);
  for (const level of LEVELS) expect(pub.deckCounts[level]).toBe(sec.decks[level].length);

  // 4 cartes Empereur.
  expect(pub.royals.length + pub.players[0].royals.length + pub.players[1].royals.length).toBe(4);

  // Réserves cohérentes et limitées.
  for (const seat of [0, 1] as const) {
    expect(pub.players[seat].reservedLevels).toHaveLength(sec.reserved[seat].length);
    expect(sec.reserved[seat].length).toBeLessThanOrEqual(3);
  }

  // Hors défausse en attente, le joueur actif a au plus 10 jetons ; l'autre aussi.
  const waiting = pub.current === 0 ? 1 : 0;
  expect(tokenTotal(pub.players[waiting].tokens)).toBeLessThanOrEqual(10);

  // L'état public ne contient aucun secret.
  const publicJson = JSON.stringify(pub);
  for (const id of [
    ...sec.reserved[0],
    ...sec.reserved[1],
    ...LEVELS.flatMap((l) => sec.decks[l]),
  ]) {
    expect(publicJson).not.toContain(`"${id}"`);
  }
}

/** Joue une partie complète en choisissant des coups légaux au hasard (biaisés vers l'achat). */
function randomGame(seed: number): { state: GameState; moves: number } {
  let state = createGame(`partie-${seed}`);
  let rng: RngState = { seed: `joueur-${seed}`, counter: 0 };
  let moves = 0;
  while (state.pub.winner === null && moves < 2000) {
    const seat = state.pub.current;
    const view = toPlayerView(state, seat);
    const legal = getLegalMoves(view);
    expect(legal.length).toBeGreaterThan(0);
    // L'adversaire n'a jamais de coup légal.
    expect(getLegalMoves(toPlayerView(state, seat === 0 ? 1 : 0))).toEqual([]);

    const buys = legal.filter((m) => m.type === 'buy');
    const [r, next] = nextRandom(rng);
    rng = next;
    const pool: Move[] = buys.length > 0 && r < 0.8 ? buys : legal;
    const [r2, next2] = nextRandom(rng);
    rng = next2;
    const move = pool[Math.floor(r2 * pool.length)]!;

    expect(validateMove(view, move)).toBeNull();
    expect(parseMove(JSON.parse(JSON.stringify(move)))).toEqual(move);
    state = applyMove(state, seat, move);
    checkInvariants(state);
    moves++;
  }
  return { state, moves };
}

describe('parties aléatoires complètes', () => {
  it('se terminent par une victoire en respectant tous les invariants', () => {
    const reasons = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = randomGame(seed);
      expect(state.pub.winner).not.toBeNull();
      reasons.add(state.pub.winReason!);
    }
    expect(reasons.size).toBeGreaterThan(0);
  });

  it('sont rejouables à l’identique (déterminisme)', () => {
    expect(randomGame(99).state).toEqual(randomGame(99).state);
  });
});

describe('cohérence getLegalMoves ⇔ validateMove', () => {
  it('rejette les coups de prise qui ne sont pas énumérés', () => {
    const s = createGame('coherence', 0);
    const view = toPlayerView(s, 0);
    const legal = new Set(
      getLegalMoves(view)
        .filter((m) => m.type === 'takeTokens')
        .map((m) => JSON.stringify([...(m as { cells: number[] }).cells].sort((a, b) => a - b))),
    );
    for (let a = 0; a < 25; a++) {
      for (let b = a + 1; b < 25; b++) {
        const move: Move = { type: 'takeTokens', cells: [a, b] };
        expect(validateMove(view, move) === null).toBe(legal.has(JSON.stringify([a, b])));
      }
    }
  });
});

describe('validation de forme des coups (entrées externes)', () => {
  it('refuse les coups mal formés', () => {
    expect(parseMove({ type: 'takeTokens', cells: [0, 1] })).not.toBeNull();
    expect(parseMove({ type: 'takeTokens', cells: [] })).toBeNull();
    expect(parseMove({ type: 'takeTokens', cells: [0, 1, 2, 3] })).toBeNull();
    expect(parseMove({ type: 'takeTokens', cells: [25] })).toBeNull();
    expect(parseMove({ type: 'takeTokens', cells: [1.5] })).toBeNull();
    expect(parseMove({ type: 'buy', cardId: '<script>' })).toBeNull();
    expect(parseMove({ type: 'steal', color: 'gold' })).toBeNull();
    expect(parseMove({ type: 'replenish', extra: 1 })).toBeNull();
    expect(parseMove({ type: 'hack' })).toBeNull();
    expect(parseMove(null)).toBeNull();
    expect(parseMove({ type: 'discard', tokens: { red: -1 } })).toBeNull();
  });
});
