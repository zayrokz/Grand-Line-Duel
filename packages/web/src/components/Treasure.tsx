import { WIN_COLOR_POINTS, WIN_CROWNS, WIN_POINTS } from '@gld/engine';
import { ICONS, TERMS } from '../theme';

/** Carte « Le Trésor » : rappel des 3 conditions de victoire (sans calcul pour les joueurs). */
export function Treasure() {
  return (
    <section className="treasure" aria-label={`${TERMS.victoryCard} : conditions de victoire`}>
      <img src={ICONS.treasure} alt="" className="treasure-icon" />
      <div>
        <h3>{TERMS.victoryCard}</h3>
        <ul>
          <li>
            ⭐ {WIN_POINTS} {TERMS.points}
          </li>
          <li>
            <img src={ICONS.crown} alt="" className="inline-icon" /> {WIN_CROWNS} {TERMS.crowns}
          </li>
          <li>⭐ {WIN_COLOR_POINTS} d’une même couleur</li>
        </ul>
      </div>
    </section>
  );
}
