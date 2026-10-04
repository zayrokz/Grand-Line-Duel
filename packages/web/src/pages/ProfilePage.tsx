import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { AuthError, User } from 'firebase/auth';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import type { HistoryDoc } from '@gld/engine';
import { Avatar } from '../components/Avatar';
import { ProfileForm } from '../components/ProfileForm';
import { useToast } from '../components/Toast';
import { auth, db } from '../firebase';
import { useSession } from '../session';
import { WIN_REASONS } from '../theme';

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':
    'Cette adresse est déjà associée à un compte : utilise « J’ai déjà un compte ».',
  'auth/invalid-email': 'Adresse e-mail invalide.',
  'auth/weak-password': 'Mot de passe trop faible (8 caractères minimum).',
  'auth/invalid-credential': 'Identifiants incorrects.',
  'auth/wrong-password': 'Identifiants incorrects.',
  'auth/user-not-found': 'Identifiants incorrects.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie plus tard.',
  'auth/popup-closed-by-user': 'Fenêtre de connexion fermée.',
  'auth/network-request-failed': 'Problème de réseau.',
  'auth/provider-already-linked': 'Ce type de compte est déjà lié.',
};

function authMessage(error: unknown): string {
  return AUTH_ERRORS[(error as AuthError)?.code] ?? 'La connexion a échoué.';
}

export function ProfilePage() {
  const { user, profile } = useSession();
  if (!user || profile === undefined) return <p className="center muted">Chargement…</p>;

  return (
    <div className="profile-page">
      <section className="panel">
        <h1>Profil</h1>
        {profile && (
          <p className="welcome">
            <Avatar id={profile.avatar} size="lg" /> <strong>{profile.nickname}</strong>
          </p>
        )}
        <ProfileForm
          key={`${profile?.nickname}-${profile?.avatar}`}
          initialNickname={profile?.nickname ?? ''}
          initialAvatar={profile?.avatar ?? 'parrot'}
          submitLabel="Enregistrer"
        />
      </section>

      {profile && (
        <section className="panel">
          <h2>Statistiques</h2>
          <div className="stats">
            <div>
              <b>{profile.stats.played}</b>
              <span>parties</span>
            </div>
            <div>
              <b>{profile.stats.wins}</b>
              <span>victoires</span>
            </div>
            <div>
              <b>{profile.stats.losses}</b>
              <span>défaites</span>
            </div>
            <div>
              <b>{profile.stats.abandons}</b>
              <span>abandons</span>
            </div>
          </div>
        </section>
      )}

      <History uid={user.uid} />
      <Account user={user} />
      <p className="center">
        <Link to="/">← Retour au port</Link>
      </p>
    </div>
  );
}

function History({ uid }: { uid: string }) {
  const [items, setItems] = useState<HistoryDoc[] | null>(null);
  useEffect(() => {
    getDocs(query(collection(db, 'users', uid, 'history'), orderBy('endedAt', 'desc'), limit(20)))
      .then((snap) => setItems(snap.docs.map((d) => d.data() as HistoryDoc)))
      .catch(() => setItems([]));
  }, [uid]);

  return (
    <section className="panel">
      <h2>Historique</h2>
      {items === null ? (
        <p className="muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="muted">Aucune partie terminée pour l’instant.</p>
      ) : (
        <ul className="history">
          {items.map((h) => (
            <li key={h.gameId} className={h.result === 'win' ? 'win' : 'loss'}>
              <span className="history-result">{h.result === 'win' ? 'Victoire' : 'Défaite'}</span>
              <span>
                contre <Avatar id={h.opponent.avatar} size="sm" /> {h.opponent.nickname}
              </span>
              <span className="muted small">
                {WIN_REASONS[h.reason]} · ⭐ {h.myPoints} – {h.opponentPoints} ·{' '}
                {new Date(h.endedAt.toMillis()).toLocaleDateString('fr-FR')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Compte : invité (anonyme) lié à Google ou à une adresse e-mail pour retrouver sa progression. */
function Account({ user }: { user: User }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch((e: unknown) => toast(authMessage(e)));
  }, [toast]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast(success, 'info');
    } catch (e) {
      toast(authMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function linkGoogle() {
    const provider = new GoogleAuthProvider();
    setBusy(true);
    try {
      await linkWithPopup(user, provider);
      toast('Compte Google lié : ta progression est sauvegardée.', 'info');
    } catch (e) {
      const code = (e as AuthError).code;
      if (code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(e as AuthError);
        const ok = window.confirm(
          'Ce compte Google est déjà utilisé. Te connecter dessus ? La progression de ce compte invité sera perdue.',
        );
        if (ok && credential) await run(() => signInWithCredential(auth, credential), 'Connecté.');
      } else if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await linkWithRedirect(user, provider);
      } else {
        toast(authMessage(e));
      }
    } finally {
      setBusy(false);
    }
  }

  function linkEmail(event: FormEvent) {
    event.preventDefault();
    void run(
      () => linkWithCredential(user, EmailAuthProvider.credential(email.trim(), password)),
      'Compte créé : ta progression est sauvegardée.',
    );
  }

  if (!user.isAnonymous) {
    const providers = user.providerData.map((p) =>
      p.providerId === 'google.com' ? 'Google' : 'e-mail',
    );
    return (
      <section className="panel">
        <h2>Compte</h2>
        <p>
          Connecté ({providers.join(', ')}){user.email ? ` : ${user.email}` : ''}. Ta progression
          est sauvegardée.
        </p>
        <button
          className="ghost"
          disabled={busy}
          onClick={() => run(() => signOut(auth), 'Déconnecté.')}
        >
          Se déconnecter
        </button>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Compte</h2>
      <p>
        Tu joues en <strong>invité</strong> : ta progression est liée à cet appareil. Lie un compte
        pour la retrouver partout.
      </p>
      <button className="secondary" disabled={busy} onClick={linkGoogle}>
        Lier un compte Google
      </button>
      <form className="email-form" onSubmit={linkEmail}>
        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <div className="action-row">
          <button className="secondary" type="submit" disabled={busy}>
            Créer mon compte
          </button>
          <button
            className="ghost"
            type="button"
            disabled={busy || !email || !password}
            onClick={() =>
              run(
                () => signInWithEmailAndPassword(auth, email.trim(), password),
                'Connecté à ton compte.',
              )
            }
          >
            J’ai déjà un compte
          </button>
          <button
            className="ghost"
            type="button"
            disabled={busy || !email}
            onClick={() =>
              run(
                () => sendPasswordResetEmail(auth, email.trim()),
                'E-mail de réinitialisation envoyé.',
              )
            }
          >
            Mot de passe oublié
          </button>
        </div>
        <p className="muted small">
          Se connecter à un compte existant remplace la session invitée actuelle (sa progression
          n’est pas fusionnée).
        </p>
      </form>
    </section>
  );
}
