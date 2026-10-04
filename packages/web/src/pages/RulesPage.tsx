import { Link } from 'react-router-dom';
import { ABILITIES, RESOURCES, TERMS } from '../theme';
import { TokenIcon } from '../components/Token';
import { GEM_COLORS } from '@gld/engine';

/** Résumé des règles (mécaniques de Splendor Duel, habillage pirate). */
export function RulesPage() {
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
            </span>
          ))}{' '}
          (4 de chaque), <TokenIcon color="pearl" size={20} decorative /> 2 {RESOURCES.pearl.plural}{' '}
          (ressource rare) et <TokenIcon color="gold" size={20} decorative /> 3{' '}
          {RESOURCES.gold.plural} (joker).
        </li>
        <li>
          3 {TERMS.privileges}, 4 {TERMS.royals}, et la carte « {TERMS.victoryCard} ».
        </li>
        <li>
          67 cartes en 3 niveaux, disposées en pyramide : 3 cartes de niveau 3, 4 de niveau 2, 5 de
          niveau 1.
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
          <strong>Remplir le plateau</strong> (si le sac n’est pas vide) : tous les jetons du sac
          sont replacés en spirale depuis le centre. Ton adversaire reçoit 1 {TERMS.privilege}.
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
          pyramide (ou le dessus d’un paquet). 3 cartes réservées au maximum, cachées à ton
          adversaire.
        </li>
        <li>
          <strong>Recruter une carte</strong> de la pyramide ou de ta réserve : paie son coût,
          réduit par les bonus de tes cartes ; les {RESOURCES.gold.plural} remplacent n’importe
          quelle ressource. Les jetons payés retournent dans le sac.
        </li>
      </ul>

      <h2>Capacités</h2>
      <ul>
        {(['extraTurn', 'joker', 'token', 'privilege', 'steal'] as const).map((key) => (
          <li key={key}>
            {ABILITIES[key].icon} <strong>{ABILITIES[key].label}</strong> : {ABILITIES[key].help}
          </li>
        ))}
      </ul>

      <h2>{TERMS.crowns}</h2>
      <p>
        À ta 3<sup>e</sup> puis à ta 6<sup>e</sup> {TERMS.crown}, choisis une {TERMS.royal}{' '}
        disponible et applique sa capacité (ce n’est pas une action).
      </p>

      <h2>Fin du tour</h2>
      <p>
        Plus de 10 jetons ? Remets dans le sac ceux de ton choix pour revenir à 10. Puis on vérifie
        la victoire.
      </p>

      <h2>{TERMS.victoryCard} : conditions de victoire</h2>
      <p>La partie s’arrête à la fin du tour d’un joueur qui atteint :</p>
      <ul>
        <li>
          20 points de {TERMS.points} (cartes et {TERMS.royals}) ;
        </li>
        <li>ou 10 {TERMS.crowns} ;</li>
        <li>ou 10 points de {TERMS.points} dans une même couleur de bonus.</li>
      </ul>

      <h2>En ligne</h2>
      <p>
        Chaque tour dispose d’un délai de 5 minutes : au-delà, ton adversaire peut réclamer la
        victoire. Tu peux recharger la page ou changer d’appareil (compte lié) sans perdre la
        partie.
      </p>
      <p className="muted small">
        Adaptation non commerciale et non officielle des mécaniques de « Splendor Duel » (Marc André
        &amp; Bruno Cathala, Space Cowboys). Univers, noms et illustrations originaux.
      </p>
      <p>
        <Link to="/">← Retour au port</Link>
      </p>
    </article>
  );
}
