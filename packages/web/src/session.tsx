/* eslint-disable react-refresh/only-export-components */
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserDoc } from '@gld/engine';
import { auth, db } from './firebase';

interface Session {
  user: User | null;
  /** `undefined` : chargement ; `null` : pas encore de profil. */
  profile: UserDoc | null | undefined;
  error: string | null;
}

const SessionContext = createContext<Session>({ user: null, profile: undefined, error: null });

/** Connexion anonyme automatique + abonnement au profil `users/{uid}`. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (next) => {
        if (next) {
          setUser(next);
          setError(null);
          return;
        }
        setUser(null);
        setProfile(undefined);
        signInAnonymously(auth).catch(() =>
          setError('Connexion impossible. Vérifie ta connexion internet puis recharge la page.'),
        );
      }),
    [],
  );

  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as UserDoc) : null),
      () => setProfile(null),
    );
  }, [user]);

  return (
    <SessionContext.Provider value={{ user, profile, error }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): Session {
  return useContext(SessionContext);
}
