import { useState } from 'react';
import { TOKEN_COLORS, tokenTotal } from '@gld/engine';
import type { Move, Pending, PlayerState, TokenColor, TokenCounts } from '@gld/engine';
import { RESOURCES } from '../theme';
import { pendingPrompt } from '../text';
import { RoyalView } from './Cards';
import { TokenIcon } from './Token';

interface Props {
  pending: Pending;
  mine: boolean;
  opponentName: string;
  legal: Move[];
  me: PlayerState;
  busy: boolean;
  send: (move: Move) => void;
}

/** Décision en attente : joker, ravitaillement, abordage, carte Empereur, défausse. */
export function PendingPanel({ pending, mine, opponentName, legal, me, busy, send }: Props) {
  return (
    <div className="pending" role="region" aria-live="polite">
      <p className="pending-prompt">{pendingPrompt(pending, mine, opponentName)}</p>
      {mine && pending.kind === 'joker' && (
        <div className="choice-row">
          {legal.flatMap((m) =>
            m.type === 'jokerColor'
              ? [
                  <button key={m.color} className="choice" disabled={busy} onClick={() => send(m)}>
                    <TokenIcon color={m.color} decorative /> {RESOURCES[m.color].plural}
                  </button>,
                ]
              : [],
          )}
        </div>
      )}
      {mine && pending.kind === 'steal' && (
        <div className="choice-row">
          {legal.flatMap((m) =>
            m.type === 'steal'
              ? [
                  <button key={m.color} className="choice" disabled={busy} onClick={() => send(m)}>
                    <TokenIcon color={m.color} decorative /> {RESOURCES[m.color].name}
                  </button>,
                ]
              : [],
          )}
        </div>
      )}
      {mine && pending.kind === 'royal' && (
        <div className="choice-row">
          {legal.flatMap((m) =>
            m.type === 'chooseRoyal'
              ? [
                  <RoyalView
                    key={m.royalId}
                    royalId={m.royalId}
                    onClick={busy ? undefined : () => send(m)}
                  />,
                ]
              : [],
          )}
        </div>
      )}
      {mine && pending.kind === 'discard' && (
        <DiscardPicker count={pending.count} me={me} busy={busy} send={send} />
      )}
    </div>
  );
}

function DiscardPicker({
  count,
  me,
  busy,
  send,
}: {
  count: number;
  me: PlayerState;
  busy: boolean;
  send: (move: Move) => void;
}) {
  const [chosen, setChosen] = useState<Partial<TokenCounts>>({});
  const total = tokenTotal(chosen);
  const change = (color: TokenColor, delta: number) =>
    setChosen((c) => ({
      ...c,
      [color]: Math.max(0, Math.min(me.tokens[color], (c[color] ?? 0) + delta)),
    }));
  return (
    <div className="discard">
      <div className="discard-grid">
        {TOKEN_COLORS.filter((c) => me.tokens[c] > 0).map((color) => (
          <div key={color} className="stepper">
            <TokenIcon color={color} />
            <button
              className="step"
              aria-label={`Rendre un ${RESOURCES[color].name} de moins`}
              disabled={(chosen[color] ?? 0) === 0}
              onClick={() => change(color, -1)}
            >
              −
            </button>
            <span className="step-value">{chosen[color] ?? 0}</span>
            <button
              className="step"
              aria-label={`Rendre un ${RESOURCES[color].name} de plus`}
              disabled={(chosen[color] ?? 0) >= me.tokens[color] || total >= count}
              onClick={() => change(color, +1)}
            >
              +
            </button>
          </div>
        ))}
      </div>
      <button
        className="primary"
        disabled={busy || total !== count}
        onClick={() => {
          const tokens = Object.fromEntries(Object.entries(chosen).filter(([, n]) => (n ?? 0) > 0));
          send({ type: 'discard', tokens });
        }}
      >
        Remettre {total}/{count} jeton{count > 1 ? 's' : ''} dans le sac
      </button>
    </div>
  );
}
