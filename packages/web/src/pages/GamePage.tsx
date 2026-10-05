import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { GameDoc } from '@gld/engine';
import { api, errorMessage } from '../api';
import { Avatar } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { useGame } from '../hooks/useGame';
import { useSession } from '../session';
import { SCENES, UI_ICONS } from '../theme';
import { GameView } from './GameView';

export function GamePage() {
  const { gameId } = useParams();
  const { user } = useSession();
  const { game, reserved, offline, error } = useGame(gameId, user?.uid);

  if (!user || !gameId || (game === undefined && !error)) {
    return <p className="center muted">Chargement de la partie…</p>;
  }
  if (error || !game || !game.playerUids.includes(user.uid)) {
    return (
      <div className="panel center">
        <h2>Partie introuvable</h2>
        <p>Ce salon n’existe pas ou tu n’en fais pas partie.</p>
        <Link className="button primary" to="/">
          Retour au port
        </Link>
      </div>
    );
  }

  return (
    <>
      {offline && <div className="banner">Connexion perdue… reconnexion en cours.</div>}
      {game.status === 'waiting' ? (
        <Lobby gameId={gameId} game={game} />
      ) : game.state ? (
        <GameView gameId={gameId} game={game} reserved={reserved} uid={user.uid} />
      ) : (
        <div className="panel center">
          <h2>Salon fermé</h2>
          <p>Ce salon a été annulé ou a expiré.</p>
          <Link className="button primary" to="/">
            Retour au port
          </Link>
        </div>
      )}
    </>
  );
}

function Lobby({ gameId, game }: { gameId: string; game: GameDoc }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/rejoindre/${game.code ?? ''}`;
  const host = game.players[0];

  async function share() {
    const data = {
      title: 'Grand Line Duel',
      text: 'Rejoins-moi pour un duel de pirates !',
      url: link,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(link);
        toast('Lien d’invitation copié !', 'info');
      }
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api.leaveGame({ gameId });
      navigate('/');
    } catch (error) {
      toast(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <div className="panel center lobby">
      <h2 className="ribbon-title">Salon ouvert</h2>
      {host && (
        <p className="lobby-host">
          <Avatar id={host.avatar} /> <span>{host.nickname} attend un adversaire…</span>
        </p>
      )}
      <p className="muted">Code du salon</p>
      <p className="room-code" role="img" aria-label={`Code ${game.code?.split('').join(' ')}`}>
        {(game.code ?? '').split('').map((letter, i) => (
          <span key={i} aria-hidden="true">
            {letter}
          </span>
        ))}
      </p>
      <div className="action-row center">
        <button className="primary" onClick={share}>
          <img src={UI_ICONS.share} alt="" className="inline-icon" /> Partager le lien d’invitation
        </button>
        <button className="ghost" disabled={busy} onClick={cancel}>
          Annuler le salon
        </button>
      </div>
      <p className="muted small">
        La partie démarre automatiquement dès que ton adversaire rejoint.
      </p>
      <div className="waiting-sea" aria-hidden="true">
        <img src={SCENES.rowboat} alt="" className="waiting-boat" />
      </div>
    </div>
  );
}
