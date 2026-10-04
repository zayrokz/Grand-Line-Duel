import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { summarize } from '@gld/engine';
import type { GameDoc, Seat } from '@gld/engine';
import { api, errorMessage } from '../api';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { ICONS, TERMS, WIN_REASONS } from '../theme';

interface Props {
  gameId: string;
  game: GameDoc;
  seat: Seat;
  uid: string;
  onHide: () => void;
}

/** Fin de partie : vainqueur, raison, scores et revanche. */
export function EndOverlay({ gameId, game, seat, uid, onHide }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const winner = game.result?.winner ?? null;
  const reason = game.result?.reason ?? 'expired';
  const oppSeat: Seat = seat === 0 ? 1 : 0;
  const oppUid = game.players[oppSeat]?.uid;
  const iAsked = game.rematch.requestedBy.includes(uid);
  const theyAsked = !!oppUid && game.rematch.requestedBy.includes(oppUid);
  const rematchId = game.rematch.gameId;

  useEffect(() => {
    if (rematchId) navigate(`/partie/${rematchId}`);
  }, [rematchId, navigate]);

  async function rematch() {
    setBusy(true);
    try {
      const { gameId: next } = await api.requestRematch({ gameId });
      if (next) navigate(`/partie/${next}`);
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const title = winner === null ? 'Partie annulée' : winner === seat ? 'Victoire !' : 'Défaite…';
  const subtitle =
    winner === null
      ? WIN_REASONS[reason]
      : winner === seat
        ? `Le trésor légendaire est à toi : ${WIN_REASONS[reason]}.`
        : `${game.players[winner]?.nickname ?? 'Ton adversaire'} s’empare du trésor : ${WIN_REASONS[reason]}.`;

  return (
    <div className="end-backdrop">
      <div
        className={`end-card ${winner === seat ? 'end-win' : 'end-loss'}`}
        role="dialog"
        aria-label={title}
      >
        <img src={ICONS.treasure} alt="" className="end-treasure" />
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {game.state && (
          <div className="end-scores">
            {game.players.map((player, i) => {
              const s = summarize(game.state!.players[i as Seat]);
              return (
                <div key={player.uid} className={`end-score ${winner === i ? 'winner' : ''}`}>
                  <Avatar id={player.avatar} />
                  <strong>{player.nickname}</strong>
                  <span>
                    ⭐ {s.points} {TERMS.points} · {s.crowns} {TERMS.crowns}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {game.startedAt && oppUid && (
          <div className="end-actions">
            <button className="primary" disabled={busy || iAsked} onClick={rematch}>
              {iAsked
                ? 'Revanche demandée…'
                : theyAsked
                  ? 'Accepter la revanche'
                  : 'Proposer une revanche'}
            </button>
            {theyAsked && !iAsked && (
              <p className="hint">{game.players[oppSeat]?.nickname} veut une revanche !</p>
            )}
            {iAsked && !theyAsked && (
              <p className="hint">En attente de {game.players[oppSeat]?.nickname}…</p>
            )}
          </div>
        )}
        <div className="action-row">
          <button className="ghost" onClick={onHide}>
            Voir le plateau
          </button>
          <Link className="button ghost" to="/">
            Retour au port
          </Link>
        </div>
      </div>
    </div>
  );
}
