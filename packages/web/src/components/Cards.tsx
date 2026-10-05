import type { CSSProperties } from 'react';
import { getCard, getRoyal, TAKEABLE_COLORS } from '@gld/engine';
import type { GemColor, Level } from '@gld/engine';
import {
  ABILITIES,
  bonusColor,
  cardImage,
  cardTheme,
  ICONS,
  JOKER_THEME,
  LEVEL_THEME,
  RESOURCES,
  royalTheme,
  TERMS,
} from '../theme';
import { TokenIcon } from './Token';

type Size = 'sm' | 'md' | 'lg';

interface CardProps {
  cardId: string;
  size?: Size;
  onClick?: () => void;
  /** Couleur effective d'une carte joker déjà associée. */
  assigned?: GemColor | null;
}

function cardLabel(cardId: string): string {
  const card = getCard(cardId);
  const bonus =
    card.bonus === null
      ? 'sans bonus'
      : card.bonus === 'joker'
        ? 'bonus polyvalent'
        : `bonus ${RESOURCES[card.bonus].name}${card.bonusCount > 1 ? ` ×${card.bonusCount}` : ''}`;
  const abilities = card.abilities.map((a) => ABILITIES[a].label).join(', ');
  return `${cardTheme(card).name}, niveau ${card.level}, ${card.points} ${TERMS.points}, ${card.crowns} ${TERMS.crowns}, ${bonus}${abilities ? `, ${abilities}` : ''}`;
}

/** Carte Équipage / Navire / Équipement. */
export function CardView({ cardId, size = 'md', onClick, assigned }: CardProps) {
  const card = getCard(cardId);
  const image = cardImage(cardId);
  const effectiveBonus = card.bonus === 'joker' && assigned ? assigned : card.bonus;
  const style = { '--bonus': bonusColor(effectiveBonus) } as CSSProperties;
  const theme = cardTheme(card);
  const content = (
    <>
      <div className="card-top">
        <span className="card-points">{card.points > 0 ? card.points : ''}</span>
        {card.crowns > 0 && (
          <span className="card-crowns" title={`${card.crowns} ${TERMS.crowns}`}>
            <img src={ICONS.crown} alt="" />
            {card.crowns}
          </span>
        )}
        <span className="card-bonus">
          {effectiveBonus === null ? null : effectiveBonus === 'joker' ? (
            <span
              className="joker-dot"
              style={{ background: JOKER_THEME.color }}
              title="Bonus polyvalent"
            />
          ) : (
            Array.from({ length: card.bonusCount }, (_, i) => (
              <TokenIcon key={i} color={effectiveBonus} size={18} />
            ))
          )}
        </span>
      </div>
      <div className="card-art">
        {image ? <img src={image} alt="" /> : <span className="card-emoji">{theme.art}</span>}
        {card.abilities.length > 0 && (
          <span className="card-abilities">
            {card.abilities.map((a) => (
              <span key={a} className="card-ability" title={ABILITIES[a].label}>
                {ABILITIES[a].icon}
              </span>
            ))}
          </span>
        )}
      </div>
      {size !== 'sm' && <div className="card-name">{theme.name}</div>}
      <ul className="card-cost" aria-label="Coût">
        {TAKEABLE_COLORS.filter((c) => (card.cost[c] ?? 0) > 0).map((color) => (
          <li
            key={color}
            style={
              { '--res': RESOURCES[color].color, '--ink': RESOURCES[color].ink } as CSSProperties
            }
          >
            {card.cost[color]}
          </li>
        ))}
      </ul>
    </>
  );
  const className = `card card-${size} lvl-${card.level}`;
  return onClick ? (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      aria-label={cardLabel(cardId)}
    >
      {content}
    </button>
  ) : (
    <div className={className} style={style} role="img" aria-label={cardLabel(cardId)}>
      {content}
    </div>
  );
}

/** Dos de carte (paquets, réserves adverses). */
export function CardBack({
  level,
  label,
  size = 'md',
  onClick,
  stack,
}: {
  level: Level;
  label?: string;
  size?: Size;
  onClick?: () => void;
  /** Nombre de cartes du paquet : l'épaisseur de la pile en dépend. */
  stack?: number;
}) {
  const style = {
    '--level': LEVEL_THEME[level].color,
    ...(stack !== undefined ? { '--d': `${Math.min(10, 1 + stack * 0.4)}px` } : {}),
  } as CSSProperties;
  const deck = stack !== undefined ? 'deck' : '';
  const content = (
    <>
      <img src={ICONS.cardBack} alt="" />
      <span className="card-back-level">{'•'.repeat(level)}</span>
      {label && <span className="card-back-label">{label}</span>}
    </>
  );
  const aria = `Paquet de niveau ${level}${label ? ` (${label})` : ''}`;
  return onClick ? (
    <button
      type="button"
      className={`card card-back card-${size} ${deck}`}
      style={style}
      onClick={onClick}
      aria-label={aria}
    >
      {content}
    </button>
  ) : (
    <div
      className={`card card-back card-${size} ${deck}`}
      style={style}
      role="img"
      aria-label={aria}
    >
      {content}
    </div>
  );
}

export function EmptySlot({ size = 'md' }: { size?: Size }) {
  return <div className={`card card-${size} card-empty`} aria-hidden="true" />;
}

/** Carte Empereur. */
export function RoyalView({
  royalId,
  size = 'md',
  onClick,
}: {
  royalId: string;
  size?: Size;
  onClick?: () => void;
}) {
  const royal = getRoyal(royalId);
  const image = cardImage(royalId);
  const theme = royalTheme(royal);
  const abilities = royal.abilities.map((a) => ABILITIES[a]);
  const label = `${theme.name} : ${royal.points} ${TERMS.points}${abilities.map((a) => `, ${a.label}`).join('')}`;
  const content = (
    <>
      <div className="card-top">
        <span className="card-points">{royal.points}</span>
        {abilities.map((a) => (
          <span key={a.label} className="card-ability-inline">
            {a.icon}
          </span>
        ))}
      </div>
      <div className="card-art">
        {image ? <img src={image} alt="" /> : <span className="card-emoji">{theme.art}</span>}
      </div>
      {size !== 'sm' && <div className="card-name">{theme.name}</div>}
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`card royal card-${size}`}
      onClick={onClick}
      aria-label={label}
    >
      {content}
    </button>
  ) : (
    <div className={`card royal card-${size}`} role="img" aria-label={label} title={label}>
      {content}
    </div>
  );
}
