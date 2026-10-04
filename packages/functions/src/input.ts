import { z } from 'zod';
import { isGameId, isMoveId } from '@gld/engine';
import { fail } from './errors.js';

/** Valide la charge utile d'une callable ; toute entrée inattendue est refusée. */
export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data ?? {});
  if (!result.success) return fail('invalid-argument', 'invalid-input');
  return result.data as T;
}

const gameId = z.string().refine(isGameId);

export const EmptyInput = z.object({}).strict();
export const ProfileInput = z
  .object({ nickname: z.string().max(200), avatar: z.string().max(40) })
  .strict();
export const JoinInput = z.object({ code: z.string().max(20) }).strict();
export const GameInput = z.object({ gameId }).strict();
export const MoveInput = z
  .object({
    gameId,
    move: z.unknown(),
    expectedVersion: z.number().int().min(0).max(100_000),
    moveId: z.string().refine(isMoveId),
  })
  .strict();
