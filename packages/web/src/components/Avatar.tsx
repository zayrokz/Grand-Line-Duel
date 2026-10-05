import type { CSSProperties } from 'react';
import { avatarTheme } from '../theme';

export function Avatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const theme = avatarTheme(id);
  return (
    <span
      className={`avatar avatar-${size}`}
      style={{ '--avatar-bg': theme.bg } as CSSProperties}
      role="img"
      aria-label={theme.label}
    >
      <img src={theme.image} alt="" draggable={false} />
    </span>
  );
}
