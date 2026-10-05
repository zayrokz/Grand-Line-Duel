import type { CSSProperties } from 'react';
import { getCard, getRoyal, TAKEABLE_COLORS } from '@gld/engine';
import type { GemColor, Level } from '@gld/engine';
import {
  ABILITIES,
  bonusTheme,
  cardImage,
  cardTheme,
  ICONS,
  LEVEL_THEME,
  RESOURCES,
  royalTheme,
  TERMS,
} from '../theme';

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

/** Fanion des points de Renommée (en haut à gauche). */
function Ribbon({ value }: { value: number }) {
  return (
    <span className="card-ribbon">
      <svg viewBox="0 0 24 42" aria-hidden="true">
        <path d="M1.5 0V39L12 33.5L22.5 39V0" />
        <path className="card-ribbon-gloss" d="M5.5 2V31" />
      </svg>
      <span className="card-ribbon-value">{value}</span>
    </span>
  );
}

/**
 * Carte Équipage / Navire / Équipement : cadre en bois, bandeau à la couleur du bonus, fanion des
 * points, médaillon du bonus, capacités, vignette en plein cadre et coûts empilés en bas à gauche.
 * Le nom n'est pas imprimé : il s'affiche au survol, dans la fiche et dans le libellé accessible.
 */
export function CardView({ cardId, size = 'md', onClick, assigned }: CardProps) {
  const card = getCard(cardId);
  const theme = cardTheme(card);
  const image = cardImage(cardId) ?? theme.art;
  const effectiveBonus = card.bonus === 'joker' && assigned ? assigned : card.bonus;
  const look = bonusTheme(effectiveBonus);
  const style = {
    '--band': look.band,
    '--ribbon': look.ribbon,
    '--ribbon-ink': look.ribbonInk,
  } as CSSProperties;
  const content = (
    <>
      <span className="card-inner">
        <span className="card-band" />
        <img className="card-art" src={image} alt="" draggable={false} />
      </span>
      {card.points > 0 && <Ribbon value={card.points} />}
      {card.crowns > 0 && (
        <span className="card-crowns" data-after-ribbon={card.points > 0}>
          <img src={ICONS.crown} alt="" />
          {card.crowns}
        </span>
      )}
      <span className="card-medals">
        {effectiveBonus === 'joker' ? (
          <img className="card-joker" src={ICONS.joker} alt="" />
        ) : effectiveBonus === null ? null : (
          Array.from({ length: card.bonusCount }, (_, i) => (
            <span key={i} className="card-medal">
              <img src={RESOURCES[effectiveBonus].glyph} alt="" />
            </span>
          ))
        )}
      </span>
      {card.abilities.length > 0 && (
        <span className="card-abilities">
          {card.abilities.map((a) => (
            <span key={a} className="card-ability" title={ABILITIES[a].label}>
              <img src={ABILITIES[a].icon} alt="" />
            </span>
          ))}
        </span>
      )}
      <ul className="card-cost" aria-hidden="true">
        {TAKEABLE_COLORS.filter((c) => (card.cost[c] ?? 0) > 0).map((color) => {
          const res = RESOURCES[color];
          return (
            <li
              key={color}
              style={
                {
                  '--num-bg': res.light ? res.color : res.edge,
                  '--num-ink': res.light ? 'var(--color-ink)' : 'var(--color-on-dark)',
                  '--face': res.color,
                } as CSSProperties
              }
            >
              <span className="cost-num">{card.cost[color]}</span>
              <span className="cost-pip">
                <img src={res.glyph} alt="" />
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
  const className = `card card-${size}`;
  return onClick ? (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      aria-label={cardLabel(cardId)}
      data-name={theme.name}
    >
      {content}
    </button>
  ) : (
    <div
      className={className}
      style={style}
      role="img"
      aria-label={cardLabel(cardId)}
      data-name={theme.name}
    >
      {content}
    </div>
  );
}

/** Nombre de couches visibles sous un paquet, selon le nombre de cartes restantes. */
function stackLayers(stack: number): number {
  if (stack > 8) return 2;
  return stack > 1 ? 1 : 0;
}

/** Dos de carte (paquets, réserves adverses) : rayures à la couleur du niveau. */
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
    '--level-edge': LEVEL_THEME[level].edge,
  } as CSSProperties;
  const layers = stack !== undefined ? stackLayers(stack) : 0;
  const content = (
    <span className="card-inner card-back-face">
      <span className="card-back-level">
        {size === 'sm' ? LEVEL_THEME[level].roman : `Niv. ${LEVEL_THEME[level].roman}`}
      </span>
      {size !== 'sm' && (
        <span className="card-back-medal">
          <img src={ICONS.logo} alt="" />
        </span>
      )}
      {label && (
        <span className="card-back-count">
          <b>{label}</b>
          {size !== 'sm' && <small>cartes</small>}
        </span>
      )}
    </span>
  );
  const aria = `Paquet de niveau ${level}${label ? ` (${label} cartes)` : ''}`;
  const className = `card card-back card-${size}`;
  return onClick ? (
    <button
      type="button"
      className={className}
      style={style}
      data-layers={layers}
      onClick={onClick}
      aria-label={aria}
    >
      {content}
    </button>
  ) : (
    <div className={className} style={style} data-layers={layers} role="img" aria-label={aria}>
      {content}
    </div>
  );
}

export function EmptySlot({ size = 'md' }: { size?: Size }) {
  return <div className={`card card-${size} card-empty`} aria-hidden="true" />;
}

/** Carte Empereur : bandeau pourpre, Renommée, capacité et emblème. */
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
  const image = cardImage(royalId) ?? royalTheme(royal).art;
  const theme = royalTheme(royal);
  const abilities = royal.abilities.map((a) => ABILITIES[a]);
  const label = `${theme.name} : ${royal.points} ${TERMS.points}${abilities.map((a) => `, ${a.label}`).join('')}`;
  const content = (
    <span className="card-inner royal-face">
      <span className="royal-band">
        <span className="royal-points">{royal.points}</span>
        {abilities.map((a) => (
          <span key={a.label} className="royal-ability" title={a.label}>
            <img src={a.icon} alt="" />
          </span>
        ))}
      </span>
      <span className="royal-art">
        <img src={image} alt="" draggable={false} />
      </span>
    </span>
  );
  return onClick ? (
    <button
      type="button"
      className={`card royal card-${size}`}
      onClick={onClick}
      aria-label={label}
      data-name={theme.name}
    >
      {content}
    </button>
  ) : (
    <div className={`card royal card-${size}`} role="img" aria-label={label} title={label}>
      {content}
    </div>
  );
}
