import { WIN_COLOR_POINTS, WIN_CROWNS, WIN_POINTS } from '@gld/engine';
import { ICONS, TERMS } from '../theme';

/** Carte « Le Trésor » : rappel des 3 conditions de victoire (sans calcul pour les joueurs). */
export function Treasure() {
  return (
    <section
      className="panel-box treasure"
      aria-label={`${TERMS.victoryCard} : conditions de victoire`}
    >
      <h3 className="ribbon-title">{TERMS.victoryCard}</h3>
      <img src={ICONS.treasure} alt="" className="treasure-icon" />
      <ul>
        <li>
          <img src={ICONS.points} alt="" />
          <b>{WIN_POINTS}</b> {TERMS.points}
        </li>
        <li>
          <img src={ICONS.crown} alt="" />
          <b>{WIN_CROWNS}</b> {TERMS.crowns}
        </li>
        <li>
          <img src={ICONS.joker} alt="" />
          <b>{WIN_COLOR_POINTS}</b> {TERMS.points} d’une même couleur
        </li>
      </ul>
    </section>
  );
}
