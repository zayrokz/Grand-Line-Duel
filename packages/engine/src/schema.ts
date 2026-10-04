import { z } from 'zod';
import { GEM_COLORS } from './types.js';
import type { Move } from './types.js';

const gemColor = z.enum(GEM_COLORS);
const takeableColor = z.enum([...GEM_COLORS, 'pearl']);
const tokenColor = z.enum([...GEM_COLORS, 'pearl', 'gold']);
const level = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const count = z.number().int().min(0).max(20);

export const CardDefSchema = z
  .object({
    id: z.string().regex(/^L[123]-\d{2}$/),
    level,
    name: z.string().min(1).max(60),
    kind: z.enum(['crew', 'ship', 'gear']),
    art: z.string().min(1).max(16),
    bonus: z.union([gemColor, z.literal('joker'), z.null()]),
    bonusCount: z.number().int().min(0).max(2),
    points: z.number().int().min(0).max(10),
    crowns: z.number().int().min(0).max(5),
    ability: z.enum(['extraTurn', 'token', 'privilege', 'steal']).nullable(),
    cost: z.partialRecord(takeableColor, z.number().int().min(1).max(10)),
  })
  .strict()
  .superRefine((card, ctx) => {
    if (card.bonus === null && card.bonusCount !== 0) {
      ctx.addIssue({
        code: 'custom',
        message: `${card.id} : une carte sans bonus a bonusCount = 0`,
      });
    }
    if (card.bonus !== null && card.bonusCount < 1) {
      ctx.addIssue({ code: 'custom', message: `${card.id} : une carte à bonus a bonusCount ≥ 1` });
    }
    if (card.bonus === 'joker' && card.bonusCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `${card.id} : une carte joker a exactement 1 bonus`,
      });
    }
    if (card.ability === 'token' && (card.bonus === null || card.bonus === 'joker')) {
      ctx.addIssue({
        code: 'custom',
        message: `${card.id} : la capacité « jeton » exige un bonus de couleur fixe`,
      });
    }
    if (!card.id.startsWith(`L${card.level}-`)) {
      ctx.addIssue({
        code: 'custom',
        message: `${card.id} : identifiant incohérent avec le niveau`,
      });
    }
  });

export const RoyalDefSchema = z
  .object({
    id: z.string().regex(/^E\d$/),
    name: z.string().min(1).max(60),
    art: z.string().min(1).max(16),
    points: z.number().int().min(0).max(10),
    ability: z.enum(['extraTurn', 'privilege', 'steal']).nullable(),
  })
  .strict();

export const CardDataSchema = z
  .object({
    $comment: z.string().optional(),
    placeholder: z.boolean(),
    cards: z.array(CardDefSchema),
    royals: z.array(RoyalDefSchema).length(4),
  })
  .strict()
  .superRefine((data, ctx) => {
    const expected = { 1: 30, 2: 24, 3: 13 } as const;
    for (const lvl of [1, 2, 3] as const) {
      const n = data.cards.filter((c) => c.level === lvl).length;
      if (n !== expected[lvl]) {
        ctx.addIssue({
          code: 'custom',
          message: `niveau ${lvl} : ${n} cartes au lieu de ${expected[lvl]}`,
        });
      }
    }
    const ids = [...data.cards.map((c) => c.id), ...data.royals.map((r) => r.id)];
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'identifiants de cartes en double' });
    }
  });

const cell = z.number().int().min(0).max(24);
const cardId = z.string().regex(/^L[123]-\d{2}$/);

/** Schéma des coups reçus du client (validation structurelle ; la légalité est vérifiée ensuite). */
export const MoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('usePrivileges'), cells: z.array(cell).min(1).max(3) }).strict(),
  z.object({ type: z.literal('replenish') }).strict(),
  z.object({ type: z.literal('takeTokens'), cells: z.array(cell).min(1).max(3) }).strict(),
  z.object({ type: z.literal('reserve'), goldCell: cell, cardId }).strict(),
  z.object({ type: z.literal('reserveDeck'), goldCell: cell, level }).strict(),
  z.object({ type: z.literal('buy'), cardId }).strict(),
  z.object({ type: z.literal('jokerColor'), color: gemColor }).strict(),
  z.object({ type: z.literal('abilityToken'), cell }).strict(),
  z.object({ type: z.literal('steal'), color: takeableColor }).strict(),
  z.object({ type: z.literal('chooseRoyal'), royalId: z.string().regex(/^E\d$/) }).strict(),
  z.object({ type: z.literal('discard'), tokens: z.partialRecord(tokenColor, count) }).strict(),
  z.object({ type: z.literal('pass') }).strict(),
]);

// Garantit à la compilation que le schéma et le type `Move` restent alignés.
type Assert<T extends true> = T;
export type MoveSchemaMatchesMove = Assert<z.infer<typeof MoveSchema> extends Move ? true : false>;

/** Valide la forme d'un coup reçu de l'extérieur. Renvoie `null` si elle est invalide. */
export function parseMove(input: unknown): Move | null {
  const result = MoveSchema.safeParse(input);
  return result.success ? result.data : null;
}
