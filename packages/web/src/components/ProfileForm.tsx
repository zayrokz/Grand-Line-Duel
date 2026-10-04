import { useState } from 'react';
import type { FormEvent } from 'react';
import { AVATAR_IDS, NICKNAME_MAX, normalizeNickname } from '@gld/engine';
import { api, errorMessage } from '../api';
import { AVATARS } from '../theme';
import { ERROR_MESSAGES } from '../text';
import { useToast } from './Toast';

interface Props {
  initialNickname?: string;
  initialAvatar?: string;
  submitLabel: string;
  onSaved?: () => void;
}

/** Choix du pseudo et de l'avatar (validés côté client puis par le serveur). */
export function ProfileForm({
  initialNickname = '',
  initialAvatar = 'parrot',
  submitLabel,
  onSaved,
}: Props) {
  const toast = useToast();
  const [nickname, setNickname] = useState(initialNickname);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  const normalized = normalizeNickname(nickname);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!normalized) {
      toast(ERROR_MESSAGES['invalid-nickname']);
      return;
    }
    setBusy(true);
    try {
      await api.saveProfile({ nickname: normalized, avatar });
      toast('Profil enregistré.', 'info');
      onSaved?.();
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <label className="field">
        <span>Nom de pirate</span>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX}
          autoComplete="nickname"
          placeholder="Ex. Barbe Écarlate"
          required
        />
      </label>
      <fieldset className="avatar-picker">
        <legend>Emblème</legend>
        {AVATAR_IDS.map((id) => (
          <label
            key={id}
            className="avatar-option"
            data-checked={avatar === id}
            title={AVATARS[id].label}
          >
            <input
              type="radio"
              name="avatar"
              value={id}
              checked={avatar === id}
              onChange={() => setAvatar(id)}
              aria-label={AVATARS[id].label}
            />
            <span aria-hidden="true">{AVATARS[id].emoji}</span>
          </label>
        ))}
      </fieldset>
      <button className="primary" type="submit" disabled={busy || !normalized}>
        {submitLabel}
      </button>
    </form>
  );
}
