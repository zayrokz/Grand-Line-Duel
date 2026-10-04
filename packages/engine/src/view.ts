import { bonuses, crowns, pointsByColor, tokenTotal, totalPoints } from './player.js';
import type { GameState, GemColor, PlayerState, PlayerView, Seat } from './types.js';

/**
 * Vue d'un joueur : l'état public (qui ne contient aucun secret par construction) et ses
 * propres cartes réservées. Les paquets, le sac, la graine et les réserves adverses restent
 * dans `state.sec`.
 */
export function toPlayerView(state: GameState, seat: Seat): PlayerView {
  return { pub: state.pub, seat, reserved: [...state.sec.reserved[seat]] };
}

export interface PlayerSummary {
  points: number;
  crowns: number;
  tokens: number;
  bonuses: Record<GemColor, number>;
  pointsByColor: Record<GemColor, number>;
}

export function summarize(player: PlayerState): PlayerSummary {
  return {
    points: totalPoints(player),
    crowns: crowns(player),
    tokens: tokenTotal(player.tokens),
    bonuses: bonuses(player),
    pointsByColor: pointsByColor(player),
  };
}
