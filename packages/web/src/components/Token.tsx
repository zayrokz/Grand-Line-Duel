import type { CSSProperties } from 'react';
import type { TokenColor } from '@gld/engine';
import { ICONS, RESOURCES } from '../theme';

/** Sous cette taille, le jeton complet devient illisible : on affiche une pastille. */
const PIP_BELOW = 26;

/**
 * Pastille : le pictogramme de la ressource sur un disque de sa couleur (coûts, journal, texte).
 * Chaque couleur est toujours accompagnée de son pictogramme.
 */
export function Pip({
  color,
  size = 20,
  decorative = false,
}: {
  color: TokenColor;
  size?: number;
  decorative?: boolean;
}) {
  const theme = RESOURCES[color];
  return (
    <span
      className="pip"
      style={{ '--face': theme.color, '--size': `${size}px` } as CSSProperties}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : theme.name}
      aria-hidden={decorative ? true : undefined}
      title={theme.name}
    >
      <img src={theme.glyph} alt="" draggable={false} />
    </span>
  );
}

/** Icône de ressource dans le texte et les boutons : jeton complet, ou pastille si petite. */
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
  if (size < PIP_BELOW) return <Pip color={color} size={size} decorative={decorative} />;
  const theme = RESOURCES[color];
  return (
    <img
      className="token-icon"
      src={theme.token}
      alt={decorative ? '' : theme.name}
      title={theme.name}
      width={size}
      height={size}
      draggable={false}
    />
  );
}

/**
 * Jeton (cerclage bois, face colorée, picto, épaisseur : tout est dans le dessin). La taille vient
 * de la variable CSS `--size` du conteneur.
 */
export function Chip({ color, label }: { color: TokenColor; label?: string }) {
  return (
    <span
      className="chip"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img src={RESOURCES[color].token} alt="" draggable={false} />
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

/** Jeton Log Pose. */
export function LogPoseToken() {
  return (
    <span className="logpose-chip" aria-hidden="true">
      <img src={ICONS.privilege} alt="" draggable={false} />
    </span>
  );
}
