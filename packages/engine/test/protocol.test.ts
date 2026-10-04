import { describe, expect, it } from 'vitest';
import {
  isAvatarId,
  isGameId,
  isMoveId,
  normalizeNickname,
  normalizeRoomCode,
} from '../src/index.js';

describe('validation des saisies', () => {
  it('normalise les pseudos', () => {
    expect(normalizeNickname('  Barbe   Rousse ')).toBe('Barbe Rousse');
    expect(normalizeNickname('Zoé-la-Brave')).toBe('Zoé-la-Brave');
    expect(normalizeNickname('Ｌｕｎａ')).toBe('Luna'); // pleine chasse → NFKC
    expect(normalizeNickname('Mo​mo')).toBe('Momo'); // caractère invisible supprimé
    expect(normalizeNickname('Ah\u0000ab')).toBe('Ahab');
  });

  it('refuse les pseudos invalides', () => {
    expect(normalizeNickname('a')).toBeNull();
    expect(normalizeNickname('x'.repeat(21))).toBeNull();
    expect(normalizeNickname('<script>')).toBeNull();
    expect(normalizeNickname('a"b')).toBeNull();
    expect(normalizeNickname(' -tiret')).toBeNull();
    expect(normalizeNickname(42)).toBeNull();
    expect(normalizeNickname(undefined)).toBeNull();
    expect(normalizeNickname('   ')).toBeNull();
  });

  it('normalise les codes de salon', () => {
    expect(normalizeRoomCode('abc-234')).toBe('ABC234');
    expect(normalizeRoomCode(' kmn pqr ')).toBe('KMNPQR');
    expect(normalizeRoomCode('ABC10O')).toBeNull(); // caractères ambigus exclus
    expect(normalizeRoomCode('ABCDE')).toBeNull();
    expect(normalizeRoomCode('ABCDEFG')).toBeNull();
    expect(normalizeRoomCode({})).toBeNull();
  });

  it('valide les identifiants', () => {
    expect(isGameId('a1B2c3D4e5F6g7H8i9J0')).toBe(true);
    expect(isGameId('../secrets/x')).toBe(false);
    expect(isMoveId('m-0123456789')).toBe(true);
    expect(isMoveId('short')).toBe(false);
    expect(isAvatarId('parrot')).toBe(true);
    expect(isAvatarId('__proto__')).toBe(false);
  });
});
