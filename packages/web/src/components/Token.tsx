import type { TokenColor } from '@gld/engine';
import { RESOURCES } from '../theme';

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

export function TokenCount({
  color,
  count,
  size = 24,
}: {
  color: TokenColor;
  count: number;
  size?: number;
}) {
  return (
    <span
      className="token-count"
      data-zero={count === 0}
      aria-label={`${count} ${RESOURCES[color].name}`}
    >
      <TokenIcon color={color} size={size} decorative />
      <span className="token-count-n">{count}</span>
    </span>
  );
}
