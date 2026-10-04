import { AVATARS, avatarEmoji } from '../theme';

export function Avatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const label = (AVATARS as Record<string, { label: string }>)[id]?.label ?? 'Pirate';
  return (
    <span className={`avatar avatar-${size}`} role="img" aria-label={label}>
      {avatarEmoji(id)}
    </span>
  );
}
