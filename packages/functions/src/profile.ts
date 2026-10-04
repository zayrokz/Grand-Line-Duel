import type { Firestore } from 'firebase-admin/firestore';
import { isAvatarId, normalizeNickname } from '@gld/engine';
import { fail } from './errors.js';
import { userUpsert } from './games.js';
import { parseInput, ProfileInput } from './input.js';
import { refs } from './paths.js';
import type { Ctx } from './paths.js';
import { checkRateLimit } from './rateLimit.js';

/** Crée ou met à jour le profil (pseudo assaini, avatar parmi la liste autorisée). */
export async function saveProfile(
  db: Firestore,
  ctx: Ctx,
  data: unknown,
): Promise<{ nickname: string; avatar: string }> {
  const input = parseInput(ProfileInput, data);
  const nickname =
    normalizeNickname(input.nickname) ?? fail('invalid-argument', 'invalid-nickname');
  if (!isAvatarId(input.avatar)) fail('invalid-argument', 'invalid-avatar');
  const avatar = input.avatar;

  await db.runTransaction(async (tx) => {
    const limit = await checkRateLimit(db, tx, ctx.uid, 'profile', ctx.now);
    if (!limit.allowed) fail('resource-exhausted', 'rate-limited');
    const userRef = refs(db).user(ctx.uid);
    const snap = await tx.get(userRef);
    tx.set(userRef, userUpsert(snap, ctx.uid, ctx.now, { nickname, avatar }), { merge: true });
    limit.commit();
  });
  return { nickname, avatar };
}
