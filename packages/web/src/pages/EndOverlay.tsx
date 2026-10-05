import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { summarize } from '@gld/engine';
import type { GameDoc, Seat } from '@gld/engine';
import { api, errorMessage } from '../api';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { ICONS, SCENES, TERMS, UI_ICONS, WIN_REASONS } from '../theme';

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

  const won = winner !== null && winner === seat;
  return (
    <div className="end-backdrop">
      {won && (
        <div className="confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              style={
                {
                  left: `${c.x}%`,
                  '--c': c.color,
                  '--r': `${c.rot}deg`,
                  '--delay': `${c.delay}ms`,
                  borderRadius: c.round ? '50%' : '3px',
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div
        className={`end-card ${won ? 'end-win' : winner === null ? 'end-none' : 'end-loss'}`}
        role="dialog"
        aria-label={title}
      >
        <h2 className="end-title">{title}</h2>
        <div className="end-illustration">
          <span className="end-rays" />
          <img src={won ? SCENES.chest : SCENES.storm} alt="" />
        </div>
        <p className="end-subtitle">{subtitle}</p>
        {game.state && (
          <div className="end-scores">
            {game.players.map((player, i) => {
              const s = summarize(game.state!.players[i as Seat]);
              return (
                <div key={player.uid} className={`end-score ${winner === i ? 'winner' : ''}`}>
                  {winner === i && <span className="end-winner-tag">Vainqueur</span>}
                  <Avatar id={player.avatar} />
                  <strong>{player.nickname}</strong>
                  <span className="end-score-values">
                    <img src={ICONS.points} alt={TERMS.points} /> {s.points}
                    <img src={ICONS.crown} alt={TERMS.crowns} /> {s.crowns}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {game.startedAt && oppUid && (
          <div className="end-actions">
            <button className="primary" disabled={busy || iAsked} onClick={rematch}>
              <img src={UI_ICONS.rematch} alt="" className="inline-icon" />
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
          <button className="secondary" onClick={onHide}>
            <img src={UI_ICONS.eye} alt="" className="inline-icon" /> Voir le plateau
          </button>
          <Link className="button secondary" to="/">
            <img src={UI_ICONS.port} alt="" className="inline-icon" /> Retour au port
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Confettis plats (pas de flou), tombés une seule fois. */
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 7) % 100,
  color: ['#f7c548', '#ee6a4e', '#2e9c8a', '#3c82c8', '#9563d0', '#3f9b4f'][i % 6]!,
  rot: (i * 47) % 180,
  delay: (i % 6) * 70,
  round: i % 3 === 0,
}));
