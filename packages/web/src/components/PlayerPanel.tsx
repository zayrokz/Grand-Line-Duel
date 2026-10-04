import { GEM_COLORS, TOKEN_COLORS } from '@gld/engine';
import type { GemColor, PlayerState, SeatInfo } from '@gld/engine';
import { RESOURCES, TERMS } from '../theme';
import { Avatar } from './Avatar';
import { CardBack, CardView, RoyalView } from './Cards';
import { ChipStack, LogPoseToken } from './Token';

interface Props {
  info: SeatInfo | undefined;
  player: PlayerState;
  active: boolean;
  isMe: boolean;
  /** Identifiants des cartes réservées (connus seulement pour soi). */
  reserved?: string[];
  onReserved?: (cardId: string) => void;
  /** Fourni quand le joueur peut utiliser ses Log Pose maintenant : ils deviennent un bouton. */
  onPrivileges?: () => void;
  timer?: string | null;
}

const COLUMNS: (GemColor | null)[] = [...GEM_COLORS, null];

/**
 * Le matériel d'un joueur, comme sur une vraie table : piles de jetons, Log Pose, cartes rangées
 * en colonnes par couleur de bonus (seule la partie haute de chaque carte reste visible),
 * réserves et cartes Empereur. Aucun total n'est calculé : c'est aux joueurs de compter.
 */
export function PlayerPanel({
  info,
  player,
  active,
  isMe,
  reserved,
  onReserved,
  onPrivileges,
  timer,
}: Props) {
  const logPoses = Array.from({ length: player.privileges }, (_, i) => <LogPoseToken key={i} />);
  const columns = COLUMNS.map((color) => ({
    color,
    cards: player.cards.filter((c) => c.color === color),
  })).filter((column) => column.cards.length > 0);

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
        {player.privileges > 0 &&
          (onPrivileges ? (
            <button
              type="button"
              className="privilege-button"
              onClick={onPrivileges}
              aria-label={`Utiliser mes ${TERMS.privileges}`}
            >
              <span className="logpose-row">{logPoses}</span>
              <span className="privilege-button-label">Utiliser</span>
            </button>
          ) : (
            <span
              className="logpose-row"
              role="img"
              aria-label={`${player.privileges} ${TERMS.privileges}`}
            >
              {logPoses}
            </span>
          ))}
      </header>

      <div className="player-table">
        <div className="player-tokens" aria-label="Jetons">
          {TOKEN_COLORS.filter((c) => player.tokens[c] > 0).map((color) => (
            <ChipStack key={color} color={color} count={player.tokens[color]} />
          ))}
          {TOKEN_COLORS.every((c) => player.tokens[c] === 0) && (
            <span className="muted small">Aucun jeton</span>
          )}
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
      </div>

      {columns.length > 0 && (
        <div className="tableau" aria-label="Cartes recrutées, rangées par couleur">
          {columns.map(({ color, cards }) => (
            <div
              key={color ?? 'none'}
              className="tableau-col"
              aria-label={color ? RESOURCES[color].plural : 'Sans bonus'}
            >
              {cards.map((c) => (
                <CardView key={c.id} cardId={c.id} size="sm" assigned={c.color} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
