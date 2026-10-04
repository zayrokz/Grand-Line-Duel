import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { normalizeRoomCode } from '@gld/engine';
import { api, errorMessage } from '../api';
import { ProfileForm } from '../components/ProfileForm';
import { useSession } from '../session';
import { ERROR_MESSAGES } from '../text';

/** Lien d'invitation : /rejoindre/CODE. */
export function JoinPage() {
  const { code: raw } = useParams();
  const { user, profile } = useSession();
  const navigate = useNavigate();
  const code = normalizeRoomCode(raw);
  const [error, setError] = useState<string | null>(code ? null : ERROR_MESSAGES['invalid-code']);
  const started = useRef(false);

  useEffect(() => {
    if (!code || !user || !profile || started.current) return;
    started.current = true;
    api
      .joinRoom({ code })
      .then(({ gameId }) => navigate(`/partie/${gameId}`, { replace: true }))
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [code, user, profile, navigate]);

  if (error) {
    return (
      <div className="panel center">
        <h2>Impossible de rejoindre</h2>
        <p>{error}</p>
        <Link className="button primary" to="/">
          Retour au port
        </Link>
      </div>
    );
  }
  if (profile === null) {
    return (
      <div className="panel">
        <h2>Invitation à un duel !</h2>
        <p>Choisis d’abord ton nom de pirate.</p>
        <ProfileForm submitLabel="Rejoindre le duel" />
      </div>
    );
  }
  return <p className="center muted">Abordage du salon {code}…</p>;
}
