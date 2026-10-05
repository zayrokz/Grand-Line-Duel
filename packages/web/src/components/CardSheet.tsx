import { findInPyramid, getCard, TAKEABLE_COLORS, validateMove } from '@gld/engine';
import type { Level, Move, PlayerView } from '@gld/engine';
import { ABILITIES, CARD_KINDS, cardTheme, LEVEL_THEME, RESOURCES, TERMS } from '../theme';
import { ILLEGAL_MESSAGES, tokenLabel } from '../text';
import { CardBack, CardView } from './Cards';
import { Modal } from './Modal';
import { TokenIcon } from './Token';

export type SheetTarget = { kind: 'card'; cardId: string } | { kind: 'deck'; level: Level };

interface Props {
  target: SheetTarget;
  view: PlayerView;
  /** Le joueur peut agir (son tour, phase principale, rien en cours d'envoi). */
  canAct: boolean;
  legal: Move[];
  onBuy: (cardId: string) => void;
  onReserve: (target: SheetTarget) => void;
  onClose: () => void;
}

/** Détail d'une carte ou d'un paquet, avec les actions légales (recruter, réserver). */
export function CardSheet({ target, view, canAct, legal, onBuy, onReserve, onClose }: Props) {
  const canReserve = legal.some((m) =>
    target.kind === 'card'
      ? m.type === 'reserve' && m.cardId === target.cardId
      : m.type === 'reserveDeck' && m.level === target.level,
  );
  const reserveReason = (() => {
    const anyGold = view.pub.board.indexOf('gold');
    const probe: Move =
      target.kind === 'card'
        ? { type: 'reserve', goldCell: Math.max(anyGold, 0), cardId: target.cardId }
        : { type: 'reserveDeck', goldCell: Math.max(anyGold, 0), level: target.level };
    const reason = validateMove(view, probe);
    return reason ? ILLEGAL_MESSAGES[reason] : null;
  })();

  if (target.kind === 'deck') {
    return (
      <Modal title={`Paquet « ${LEVEL_THEME[target.level].name} »`} onClose={onClose}>
        <div className="sheet">
          <CardBack
            level={target.level}
            size="lg"
            label={String(view.pub.deckCounts[target.level])}
          />
          <div className="sheet-info">
            <p>
              {view.pub.deckCounts[target.level]} carte(s) de niveau {target.level} restante(s).
              Réserver la carte du dessus la garde secrète pour toi, et te donne 1{' '}
              {RESOURCES.gold.name}.
            </p>
            {canAct && (
              <div className="sheet-actions">
                <button
                  className="secondary"
                  disabled={!canReserve}
                  onClick={() => onReserve(target)}
                >
                  Réserver la carte du dessus
                </button>
                {!canReserve && reserveReason && <p className="hint">{reserveReason}</p>}
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  const card = getCard(target.cardId);
  const inPyramid = findInPyramid(view.pub, card.id) !== null;
  const isMine = view.reserved.includes(card.id);
  const buyReason = validateMove(view, { type: 'buy', cardId: card.id });
  const theme = cardTheme(card);

  return (
    <Modal title={theme.name} onClose={onClose}>
      <div className="sheet">
        <CardView cardId={card.id} size="lg" />
        <div className="sheet-info">
          <dl className="facts">
            <dt>Type</dt>
            <dd>
              {CARD_KINDS[theme.kind]} · niveau {card.level}
            </dd>
            <dt>{TERMS.points}</dt>
            <dd>{card.points}</dd>
            <dt>{TERMS.crowns}</dt>
            <dd>{card.crowns}</dd>
            <dt>Bonus</dt>
            <dd>
              {card.bonus === null
                ? 'aucun'
                : card.bonus === 'joker'
                  ? 'polyvalent'
                  : `${card.bonusCount} ${RESOURCES[card.bonus].name}`}
            </dd>
            {card.abilities.length > 0 && (
              <>
                <dt>{card.abilities.length > 1 ? 'Capacités' : 'Capacité'}</dt>
                <dd>
                  {card.abilities.map((a) => (
                    <span key={a} className="ability-line">
                      <img src={ABILITIES[a].icon} alt="" className="inline-icon" />{' '}
                      <strong>{ABILITIES[a].label}</strong> — {ABILITIES[a].help}
                    </span>
                  ))}
                </dd>
              </>
            )}
            <dt>Coût</dt>
            <dd className="cost-line">
              {TAKEABLE_COLORS.filter((c) => (card.cost[c] ?? 0) > 0).map((c) => (
                <span key={c} className="cost-item">
                  <TokenIcon color={c} size={22} decorative /> {tokenLabel(c, card.cost[c] ?? 0)}
                </span>
              ))}
            </dd>
          </dl>
          {canAct && (inPyramid || isMine) && (
            <div className="sheet-actions">
              <button
                className="primary"
                disabled={buyReason !== null}
                onClick={() => onBuy(card.id)}
              >
                Recruter
              </button>
              {buyReason && <p className="hint">{ILLEGAL_MESSAGES[buyReason]}</p>}
              {inPyramid && (
                <>
                  <button
                    className="secondary"
                    disabled={!canReserve}
                    onClick={() => onReserve(target)}
                  >
                    Réserver (+1 {RESOURCES.gold.name})
                  </button>
                  {!canReserve && reserveReason && <p className="hint">{reserveReason}</p>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
