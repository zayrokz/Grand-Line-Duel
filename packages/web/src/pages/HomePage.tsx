import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '@gld/engine';
import { api, errorDetails, errorMessage } from '../api';
import { Avatar } from '../components/Avatar';
import { ProfileForm } from '../components/ProfileForm';
import { useToast } from '../components/Toast';
import { useSession } from '../session';
import { ERROR_MESSAGES } from '../text';
import { GAME_TAGLINE, ICONS, SCENES, UI_ICONS } from '../theme';

export function HomePage() {
  const { user, profile, error } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) return <p className="center error">{error}</p>;
  if (!user || profile === undefined) return <p className="center muted">Hissez les voiles…</p>;

  if (profile === null) {
    return (
      <div className="panel onboarding">
        <span className="hero-logo">
          <img src={ICONS.logo} alt="" />
        </span>
        <h1>Bienvenue à bord !</h1>
        <p className="tagline">{GAME_TAGLINE}</p>
        <ProfileForm submitLabel="Embarquer" />
      </div>
    );
  }

  async function createRoom() {
    setBusy(true);
    try {
      const { gameId } = await api.createRoom({});
      navigate(`/partie/${gameId}`);
    } catch (e) {
      const { reason, gameId } = errorDetails(e);
      if (reason === 'already-in-game' && gameId) navigate(`/partie/${gameId}`);
      else toast(errorMessage(e));
      setBusy(false);
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      toast(ERROR_MESSAGES['invalid-code']);
      return;
    }
    setBusy(true);
    try {
      const { gameId } = await api.joinRoom({ code: normalized });
      navigate(`/partie/${gameId}`);
    } catch (e) {
      toast(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="home">
      <section className="panel hero">
        <span className="hero-logo">
          <img src={ICONS.logo} alt="" />
        </span>
        <h1>Grand Line Duel</h1>
        <p className="tagline">{GAME_TAGLINE}</p>
        <p className="welcome">
          <Avatar id={profile.avatar} /> Ahoy, <strong>{profile.nickname}</strong> !{' '}
          <Link to="/profil" className="edit-link">
            <img src={UI_ICONS.edit} alt="" className="inline-icon" />
            Modifier
          </Link>
        </p>
      </section>

      <div className="home-actions">
        {profile.currentGameId && (
          <section className="panel action-card">
            <div className="scene">
              <img src={SCENES.galleon} alt="" />
            </div>
            <h2>Partie en cours</h2>
            <p>Ton navire t’attend.</p>
            <Link className="button primary" to={`/partie/${profile.currentGameId}`}>
              Reprendre la partie
            </Link>
          </section>
        )}

        <section className="panel action-card">
          <div className="scene">
            <img src={SCENES.rowboat} alt="" />
          </div>
          <h2>Nouveau duel</h2>
          <p>Crée un salon et envoie le lien à ton rival.</p>
          <button className="primary" disabled={busy} onClick={createRoom}>
            Créer un salon
          </button>
        </section>

        <section className="panel action-card">
          <div className="scene">
            <img src={SCENES.navigator} alt="" />
          </div>
          <h2>Rejoindre un salon</h2>
          <form className="join-form" onSubmit={join}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
              aria-label="Code du salon"
              maxLength={ROOM_CODE_LENGTH + 2}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
            <button
              className="secondary"
              type="submit"
              disabled={busy || code.trim().length < ROOM_CODE_LENGTH}
            >
              Rejoindre
            </button>
          </form>
        </section>
      </div>

      <nav className="home-links" aria-label="Liens">
        <Link className="button secondary" to="/regles">
          <img src={UI_ICONS.rules} alt="" className="inline-icon" /> Règles du jeu
        </Link>
        <Link className="button secondary" to="/profil">
          <img src={UI_ICONS.profile} alt="" className="inline-icon" /> Profil, statistiques et
          compte
        </Link>
      </nav>
    </div>
  );
}
