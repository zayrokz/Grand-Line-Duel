import { GEM_COLORS, summarize, WIN_COLOR_POINTS, WIN_CROWNS, WIN_POINTS } from '@gld/engine';
import type { PlayerState } from '@gld/engine';
import { ICONS, RESOURCES, TERMS } from '../theme';

/** Carte « Le Trésor » : rappel des 3 conditions de victoire et progression du joueur. */
export function Treasure({ player }: { player?: PlayerState }) {
  const s = player ? summarize(player) : null;
  const best = s ? Math.max(...GEM_COLORS.map((c) => s.pointsByColor[c])) : 0;
  const bestColor = s ? GEM_COLORS.find((c) => s.pointsByColor[c] === best) : undefined;
  return (
    <section className="treasure" aria-label={`${TERMS.victoryCard} : conditions de victoire`}>
      <img src={ICONS.treasure} alt="" className="treasure-icon" />
      <div>
        <h3>{TERMS.victoryCard}</h3>
        <ul>
          <li>
            ⭐ {WIN_POINTS} {TERMS.points}
            {s && <span className="progress"> ({s.points})</span>}
          </li>
          <li>
            <img src={ICONS.crown} alt="" className="inline-icon" /> {WIN_CROWNS} {TERMS.crowns}
            {s && <span className="progress"> ({s.crowns})</span>}
          </li>
          <li>
            ⭐ {WIN_COLOR_POINTS} d’une même couleur
            {s && bestColor && best > 0 && (
              <span className="progress">
                {' '}
                ({best} {RESOURCES[bestColor].plural})
              </span>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}
