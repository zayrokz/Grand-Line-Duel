import { useCallback, useRef, useState } from 'react';
import type { Move } from '@gld/engine';
import { api, errorDetails, errorMessage, isTransient } from '../api';

/**
 * Envoi des coups au serveur : un identifiant unique par coup (idempotence), version attendue
 * (concurrence), nouvelles tentatives automatiques sur erreur réseau avec le même identifiant.
 */
export function useMoveSender(gameId: string, version: number, onError: (msg: string) => void) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const send = useCallback(
    async (move: Move): Promise<boolean> => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setBusy(true);
      const moveId = crypto.randomUUID();
      try {
        for (let attempt = 0; ; attempt++) {
          try {
            await api.submitMove({ gameId, move, expectedVersion: version, moveId });
            return true;
          } catch (error) {
            if (isTransient(error) && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
              continue;
            }
            // Version périmée : l'état à jour arrive par l'abonnement, inutile d'alerter.
            if (errorDetails(error).reason !== 'stale-version') onError(errorMessage(error));
            return false;
          }
        }
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [gameId, version, onError],
  );

  return { send, busy };
}
