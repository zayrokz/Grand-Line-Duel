import type { CSSProperties } from 'react';
import { GEM_COLORS, MAX_TOKENS, summarize, TOKEN_COLORS } from '@gld/engine';
import type { PlayerState, SeatInfo } from '@gld/engine';
import { ICONS, RESOURCES, TERMS } from '../theme';
import { Avatar } from './Avatar';
import { CardBack, CardView, RoyalView } from './Cards';
import { TokenCount } from './Token';

interface Props {
  info: SeatInfo | undefined;
  player: PlayerState;
  active: boolean;
  isMe: boolean;
  /** Identifiants des cartes réservées (connus seulement pour soi). */
  reserved?: string[];
  onReserved?: (cardId: string) => void;
  timer?: string | null;
}

/** Tableau d'un joueur : jetons, bonus, Renommée par couleur, réserves, cartes Empereur. */
export function PlayerPanel({ info, player, active, isMe, reserved, onReserved, timer }: Props) {
  const s = summarize(player);
  return (
    <section
      className={`player ${active ? 'player-active' : ''} ${isMe ? 'player-me' : 'player-opp'}`}
    >
      <header className="player-header">
        <Avatar id={info?.avatar ?? ''} />
        <div className="player-name">
          <strong>{info?.nickname ?? 'Pirate'}</strong>
          {isMe && <span className="tag">toi</span>}
          {active && (
            <span className="tag tag-turn">{timer ? `à son tour · ${timer}` : 'à son tour'}</span>
          )}
        </div>
        <div className="player-scores">
          <span title={TERMS.points}>⭐ {s.points}</span>
          <span title={TERMS.crowns}>
            <img src={ICONS.crown} alt={TERMS.crowns} className="inline-icon" /> {s.crowns}
          </span>
          <span title={TERMS.privileges}>
            <img src={ICONS.privilege} alt={TERMS.privileges} className="inline-icon" />{' '}
            {player.privileges}
          </span>
        </div>
      </header>

      <div className="player-tokens" aria-label={`Jetons (${s.tokens}/${MAX_TOKENS})`}>
        {TOKEN_COLORS.map((color) => (
          <TokenCount key={color} color={color} count={player.tokens[color]} />
        ))}
        <span className="token-total" data-full={s.tokens >= MAX_TOKENS}>
          {s.tokens}/{MAX_TOKENS}
        </span>
      </div>

      <div className="player-bonuses" aria-label="Bonus et Renommée par couleur">
        {GEM_COLORS.map((color) => (
          <span
            key={color}
            className="bonus-chip"
            style={
              { '--res': RESOURCES[color].color, '--ink': RESOURCES[color].ink } as CSSProperties
            }
            title={`${RESOURCES[color].plural} : bonus ${s.bonuses[color]}, ${s.pointsByColor[color]} ${TERMS.points}`}
          >
            <b>{s.bonuses[color]}</b>
            <small>⭐{s.pointsByColor[color]}</small>
          </span>
        ))}
      </div>

      {(player.reservedLevels.length > 0 || player.royals.length > 0) && (
        <div className="player-extras">
          {player.reservedLevels.length > 0 && (
            <div className="player-reserved" aria-label="Cartes réservées">
              {isMe && reserved
                ? reserved.map((id) => (
                    <CardView
                      key={id}
                      cardId={id}
                      size="sm"
                      onClick={onReserved ? () => onReserved(id) : undefined}
                    />
                  ))
                : player.reservedLevels.map((level, i) => (
                    <CardBack key={i} level={level} size="sm" />
                  ))}
            </div>
          )}
          {player.royals.length > 0 && (
            <div className="player-royals" aria-label={TERMS.royals}>
              {player.royals.map((id) => (
                <RoyalView key={id} royalId={id} size="sm" />
              ))}
            </div>
          )}
        </div>
      )}

      {player.cards.length > 0 && (
        <details className="player-cards">
          <summary>
            {player.cards.length} carte{player.cards.length > 1 ? 's' : ''} recrutée
            {player.cards.length > 1 ? 's' : ''}
          </summary>
          <div className="player-cards-list">
            {player.cards.map((c) => (
              <CardView key={c.id} cardId={c.id} size="sm" assigned={c.color} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
