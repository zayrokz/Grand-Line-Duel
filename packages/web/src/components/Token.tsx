import type { CSSProperties } from 'react';
import type { TokenColor } from '@gld/engine';
import { ICONS, RESOURCES } from '../theme';

/** Petite icône plate (texte, boutons, règles). */
export function TokenIcon({
  color,
  size = 28,
  decorative = false,
}: {
  color: TokenColor;
  size?: number;
  /** Icône accompagnée de son nom en texte : masquée des lecteurs d'écran. */
  decorative?: boolean;
}) {
  const theme = RESOURCES[color];
  return (
    <img
      className="token-icon"
      src={theme.icon}
      alt={decorative ? '' : theme.name}
      title={theme.name}
      width={size}
      height={size}
      draggable={false}
    />
  );
}

/**
 * Jeton en relief (disque épais, reflet, ombre). La taille vient de la variable CSS `--size`
 * du conteneur ; la couleur de la tranche est dérivée de la couleur de la ressource.
 */
export function Chip({ color, label }: { color: TokenColor; label?: string }) {
  return (
    <span
      className="chip"
      style={{ '--chip': RESOURCES[color].color } as CSSProperties}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img src={RESOURCES[color].icon} alt="" draggable={false} />
    </span>
  );
}

/** Pile de jetons d'une couleur : pas de nombre affiché, c'est au joueur de compter. */
export function ChipStack({ color, count }: { color: TokenColor; count: number }) {
  const theme = RESOURCES[color];
  return (
    <span
      className="chip-stack"
      role="img"
      aria-label={`${count} ${count > 1 ? theme.plural : theme.name}`}
      title={theme.plural}
    >
      {Array.from({ length: count }, (_, i) => (
        <Chip key={i} color={color} />
      ))}
    </span>
  );
}

/** Jeton Log Pose en relief. */
export function LogPoseToken() {
  return (
    <span className="chip chip-logpose" aria-hidden="true">
      <img src={ICONS.privilege} alt="" draggable={false} />
    </span>
  );
}
