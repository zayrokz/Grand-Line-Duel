import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { GameDoc, PrivateDoc } from '@gld/engine';
import { db } from '../firebase';

export interface GameSubscription {
  game: GameDoc | null | undefined;
  reserved: string[];
  /** Données servies depuis le cache local (connexion perdue). */
  offline: boolean;
  error: 'not-found' | null;
}

interface Snapshot {
  key: string;
  game: GameDoc | null;
  offline: boolean;
  error: 'not-found' | null;
}

/**
 * Abonnement temps réel au salon et aux cartes réservées du joueur. Firestore se reconnecte
 * automatiquement après une coupure : l'état reprend là où il en est sur le serveur.
 * Les états sont indexés par clé (partie + joueur) pour ne jamais afficher une partie précédente.
 */
export function useGame(gameId: string | undefined, uid: string | undefined): GameSubscription {
  const key = `${gameId ?? ''}/${uid ?? ''}`;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [privateDoc, setPrivateDoc] = useState<{ key: string; reserved: string[] } | null>(null);

  useEffect(() => {
    if (!gameId || !uid) return undefined;
    return onSnapshot(
      doc(db, 'games', gameId),
      { includeMetadataChanges: true },
      (snap) => {
        const offline = snap.metadata.fromCache;
        if (!snap.exists()) {
          // Un document absent du cache n'est pas une preuve d'absence sur le serveur.
          if (!offline) setSnapshot({ key, game: null, offline, error: 'not-found' });
          return;
        }
        setSnapshot({ key, game: snap.data() as GameDoc, offline, error: null });
      },
      () => setSnapshot({ key, game: null, offline: false, error: 'not-found' }),
    );
  }, [gameId, uid, key]);

  const current = snapshot?.key === key ? snapshot : null;
  const isPlayer = !!current?.game && !!uid && current.game.playerUids.includes(uid);

  useEffect(() => {
    if (!gameId || !uid || !isPlayer) return undefined;
    return onSnapshot(
      doc(db, 'games', gameId, 'private', uid),
      (snap) =>
        setPrivateDoc({
          key,
          reserved: snap.exists() ? ((snap.data() as PrivateDoc).reserved ?? []) : [],
        }),
      () => setPrivateDoc({ key, reserved: [] }),
    );
  }, [gameId, uid, isPlayer, key]);

  return {
    game: current ? current.game : undefined,
    reserved: privateDoc?.key === key ? privateDoc.reserved : [],
    offline: current?.offline ?? false,
    error: current?.error ?? null,
  };
}
