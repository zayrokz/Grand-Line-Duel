import { Link } from 'react-router-dom';
import {
  CARD_ABILITIES,
  CARDS,
  CROWN_THRESHOLDS,
  GEM_COLORS,
  MAX_RESERVED,
  MAX_TOKENS,
  PYRAMID_SIZE,
  ROYALS,
  RULES,
  TOTAL_PRIVILEGES,
  TURN_TIMEOUT_MS,
  WIN_COLOR_POINTS,
  WIN_CROWNS,
  WIN_POINTS,
} from '@gld/engine';
import { TokenIcon } from '../components/Token';
import { ABILITIES, RESOURCES, TERMS, UI_ICONS } from '../theme';

const ordinal = (n: number) => (n === 1 ? '1re' : `${n}e`);

/** Résumé des règles (mécaniques de Splendor Duel, habillage pirate). Valeurs issues des données. */
export function RulesPage() {
  const gemCounts = new Set(GEM_COLORS.map((c) => RULES.tokens[c]));
  const sameGemCount = gemCounts.size === 1 ? RULES.tokens.white : null;
  return (
    <article className="panel rules">
      <h1>Règles de Grand Line Duel</h1>
      <p>
        Deux capitaines rivaux recrutent équipages, navires et équipements pour gagner en{' '}
        {TERMS.points.toLowerCase()} et mettre la main sur le trésor légendaire.
      </p>

      <h2>Le matériel</h2>
      <ul>
        <li>
          Ressources :{' '}
          {GEM_COLORS.map((c) => (
            <span key={c} className="rule-token">
              <TokenIcon color={c} size={20} decorative /> {RESOURCES[c].plural}
              {sameGemCount === null && ` (${RULES.tokens[c]})`}
            </span>
          ))}
          {sameGemCount !== null && ` (${sameGemCount} de chaque)`},{' '}
          <TokenIcon color="pearl" size={20} decorative /> {RULES.tokens.pearl}{' '}
          {RESOURCES.pearl.plural} (ressource rare) et{' '}
          <TokenIcon color="gold" size={20} decorative /> {RULES.tokens.gold}{' '}
          {RESOURCES.gold.plural} (joker).
        </li>
        <li>
          {TOTAL_PRIVILEGES} {TERMS.privileges}, {ROYALS.length} {TERMS.royals}, et la carte «{' '}
          {TERMS.victoryCard} ».
        </li>
        <li>
          {CARDS.length} cartes en 3 niveaux, disposées en pyramide : {PYRAMID_SIZE[3]} cartes de
          niveau 3, {PYRAMID_SIZE[2]} de niveau 2, {PYRAMID_SIZE[1]} de niveau 1.
        </li>
      </ul>

      <h2>Ton tour</h2>
      <p>
        Dans cet ordre : 0, 1 ou 2 actions optionnelles, puis exactement une action obligatoire.
      </p>
      <h3>Actions optionnelles</h3>
      <ol>
        <li>
          <strong>Utiliser des {TERMS.privileges}</strong> : chaque {TERMS.privilege} dépensé
          rapporte 1 ressource au choix sur le plateau (jamais de {RESOURCES.gold.name}).
        </li>
        <li>
          <strong>Remplir le plateau</strong> (si le sac n’est pas vide) : touche le sac, à côté du
          plateau ; tous ses jetons sont replacés en spirale depuis le centre. Ton adversaire reçoit
          1 {TERMS.privilege}.
        </li>
      </ol>
      <h3>Action obligatoire (une seule)</h3>
      <ul>
        <li>
          <strong>Prendre jusqu’à 3 jetons</strong> adjacents en ligne droite (ligne, colonne ou
          diagonale), sans case vide ni {RESOURCES.gold.name}. Si tu prends 3 jetons identiques ou
          les 2 {RESOURCES.pearl.plural}, ton adversaire reçoit 1 {TERMS.privilege}.
        </li>
        <li>
          <strong>Réserver une carte</strong> : prends 1 {RESOURCES.gold.name} et une carte de la
          pyramide (ou le dessus d’un paquet). {MAX_RESERVED} cartes réservées au maximum, cachées à
          ton adversaire.
        </li>
        <li>
          <strong>Recruter une carte</strong> de la pyramide ou de ta réserve : paie son coût,
          réduit par les bonus de tes cartes ; les {RESOURCES.gold.plural} remplacent n’importe
          quelle ressource. Les jetons payés retournent dans le sac.
        </li>
      </ul>

      <h2>Capacités</h2>
      <ul>
        {CARD_ABILITIES.map((key) => (
          <li key={key}>
            <img src={ABILITIES[key].icon} alt="" className="inline-icon" />{' '}
            <strong>{ABILITIES[key].label}</strong> : {ABILITIES[key].help}
          </li>
        ))}
      </ul>

      <h2>{TERMS.crowns}</h2>
      <p>
        {CROWN_THRESHOLDS.map((threshold, i) => (
          <span key={threshold}>
            {i === 0 ? 'À ta ' : ' puis à ta '}
            {ordinal(threshold)} {TERMS.crown}
          </span>
        ))}
        , choisis une {TERMS.royal} disponible et applique sa capacité (ce n’est pas une action).
      </p>

      <h2>Fin du tour</h2>
      <p>
        Plus de {MAX_TOKENS} jetons ? Remets dans le sac ceux de ton choix pour revenir à{' '}
        {MAX_TOKENS}. Puis on vérifie la victoire.
      </p>

      <h2>{TERMS.victoryCard} : conditions de victoire</h2>
      <p>La partie s’arrête à la fin du tour d’un joueur qui atteint :</p>
      <ul>
        <li>
          {WIN_POINTS} points de {TERMS.points} (cartes et {TERMS.royals}) ;
        </li>
        <li>
          ou {WIN_CROWNS} {TERMS.crowns} ;
        </li>
        <li>
          ou {WIN_COLOR_POINTS} points de {TERMS.points} dans une même couleur de bonus.
        </li>
      </ul>

      <h2>En ligne</h2>
      <p>
        Chaque tour dispose d’un délai de {TURN_TIMEOUT_MS / 60000} minutes : au-delà, ton
        adversaire peut réclamer la victoire. Tu peux recharger la page ou changer d’appareil
        (compte lié) sans perdre la partie.
      </p>
      <p className="muted small">
        Adaptation non commerciale et non officielle des mécaniques de « Splendor Duel » (Marc André
        &amp; Bruno Cathala, Space Cowboys). Univers, noms et illustrations originaux.
      </p>
      <p>
        <Link className="button secondary" to="/">
          <img src={UI_ICONS.port} alt="" className="inline-icon" /> Retour au port
        </Link>
      </p>
    </article>
  );
}
