import type { Ref } from 'react';
import { ICONS } from '../theme';

interface Props {
  count: number;
  open: boolean;
  shaking: boolean;
  /** Le joueur peut remplir le plateau maintenant : le bouton passe au jaune « Remplir ». */
  canRefill: boolean;
  bounceKey: number;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}

/** Le sac (pioche) : nombre de jetons, remplissage du plateau, animation d'ouverture. */
export function Bag({ count, open, shaking, canRefill, bounceKey, onClick, ref }: Props) {
  const label = canRefill
    ? `Remplir le plateau avec le sac (${count} jeton${count > 1 ? 's' : ''})`
    : `Sac : ${count} jeton${count > 1 ? 's' : ''}`;
  return (
    <button
      ref={ref}
      type="button"
      className={`bag ${canRefill ? 'bag-ready' : ''} ${shaking ? 'bag-shake' : ''} ${open ? 'bag-is-open' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {/* Enveloppe animée : le bouton lui-même ne bouge pas (cible de clic stable). */}
      <span key={bounceKey} className={`bag-body ${bounceKey > 0 ? 'bag-bounce' : ''}`}>
        <img className="bag-img" src={ICONS.bag} alt="" draggable={false} />
      </span>
      <span className="bag-label">{canRefill ? 'Remplir' : 'Sac'}</span>
      <span className="bag-count">{count}</span>
    </button>
  );
}
