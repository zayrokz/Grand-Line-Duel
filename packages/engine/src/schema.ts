import { z } from 'zod';
import { CARD_ABILITIES, GEM_COLORS, ROYAL_ABILITIES } from './types.js';
import type { Move } from './types.js';

const gemColor = z.enum(GEM_COLORS);
const takeableColor = z.enum([...GEM_COLORS, 'pearl']);
const tokenColor = z.enum([...GEM_COLORS, 'pearl', 'gold']);
const level = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const count = z.number().int().min(0).max(20);
const positive = z.number().int().min(1).max(100);
/** Identifiant de carte : sûr pour Firestore, les URL et les noms de fichiers d'illustration. */
const id = z.string().regex(/^[A-Za-z0-9-]{1,16}$/);

/** Plateau 5×5 : la mise en place pose tous les jetons, il en faut donc exactement 25. */
export const BOARD_CELLS = 25;

/** Quantités annoncées pour le matériel (contrôle d'intégrité du fichier). */
export const EXPECTED_CARDS_PER_LEVEL = { 1: 30, 2: 24, 3: 13 } as const;
export const EXPECTED_ROYALS = 4;

const unique = <T>(items: readonly T[]) => new Set(items).size === items.length;

export const CardDefSchema = z
  .object({
    id,
    level,
    family: z.string().min(1).max(32),
    bonus: z.union([gemColor, z.literal('joker'), z.null()]),
    bonusCount: z.number().int().min(0).max(2),
    points: count,
    crowns: count,
    abilities: z.array(z.enum(CARD_ABILITIES)).max(CARD_ABILITIES.length),
    cost: z.partialRecord(takeableColor, count),
  })
  .strict()
  .superRefine((card, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message: `${card.id} : ${message}` });
    if ((card.bonus === null) !== (card.bonusCount === 0)) {
      issue('bonus null ⇔ bonusCount = 0');
    }
    if (card.bonus === 'joker' && card.bonusCount !== 1)
      issue('une carte joker a exactement 1 bonus');
    if ((card.bonus === 'joker') !== card.abilities.includes('associate')) {
      issue('le bonus « joker » va de pair avec la capacité « associate »');
    }
    if (card.abilities.includes('take_token') && (card.bonus === null || card.bonus === 'joker')) {
      issue('la capacité « take_token » exige un bonus de couleur fixe');
    }
    if (!unique(card.abilities)) issue('capacité en double');
  });

export const RoyalDefSchema = z
  .object({
    id,
    points: count,
    abilities: z.array(z.enum(ROYAL_ABILITIES)).max(ROYAL_ABILITIES.length),
  })
  .strict()
  .superRefine((royal, ctx) => {
    if (!unique(royal.abilities))
      ctx.addIssue({ code: 'custom', message: `${royal.id} : capacité en double` });
  });

export const MetaSchema = z
  .object({
    description: z.string().optional(),
    colorCycle: z.array(gemColor),
    colors: z.array(gemColor),
    abilities: z
      .object(Object.fromEntries(CARD_ABILITIES.map((a) => [a, z.string().min(1)])))
      .strict(),
    tokens: z
      .object({
        white: count,
        blue: count,
        green: count,
        red: count,
        black: count,
        pearl: count,
        gold: count,
      })
      .strict(),
    privileges: positive,
    pyramid: z.object({ level1: positive, level2: positive, level3: positive }).strict(),
    royalThresholds: z.array(positive).min(1),
    victory: z
      .object({ totalPoints: positive, crowns: positive, pointsInOneColor: positive })
      .strict(),
    maxTokens: positive,
    maxReserved: positive,
  })
  .strict()
  .superRefine((meta, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message: `meta : ${message}` });
    const sameColors = (list: readonly string[]) =>
      list.length === GEM_COLORS.length &&
      unique(list) &&
      GEM_COLORS.every((c) => list.includes(c));
    if (!sameColors(meta.colors)) issue(`colors doit contenir exactement ${GEM_COLORS.join(', ')}`);
    if (!sameColors(meta.colorCycle)) issue('colorCycle doit être une permutation des couleurs');
    const total = Object.values(meta.tokens).reduce((a, b) => a + b, 0);
    if (total !== BOARD_CELLS)
      issue(`${total} jetons au total, il en faut ${BOARD_CELLS} (plateau 5×5)`);
    if (meta.tokens.gold === 0) issue('au moins 1 jeton Or est nécessaire pour réserver');
    const thresholds = meta.royalThresholds;
    if (thresholds.some((t, i) => i > 0 && t <= thresholds[i - 1]!)) {
      issue('royalThresholds doit être strictement croissant');
    }
  });

export const CardDataSchema = z
  .object({
    meta: MetaSchema,
    cards: z.array(CardDefSchema),
    royals: z.array(RoyalDefSchema),
  })
  .strict()
  .superRefine((data, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const lvl of [1, 2, 3] as const) {
      const n = data.cards.filter((c) => c.level === lvl).length;
      if (n !== EXPECTED_CARDS_PER_LEVEL[lvl]) {
        issue(`niveau ${lvl} : ${n} cartes au lieu de ${EXPECTED_CARDS_PER_LEVEL[lvl]}`);
      }
      const shown = data.meta.pyramid[`level${lvl}`];
      if (n < shown) issue(`niveau ${lvl} : moins de cartes (${n}) que d'emplacements (${shown})`);
    }
    if (data.royals.length !== EXPECTED_ROYALS) {
      issue(`${data.royals.length} cartes Royales au lieu de ${EXPECTED_ROYALS}`);
    }
    if (data.meta.royalThresholds.length > data.royals.length) {
      issue('plus de seuils de Couronnes que de cartes Royales');
    }
    if (!unique([...data.cards.map((c) => c.id), ...data.royals.map((r) => r.id)])) {
      issue('identifiants de cartes en double');
    }
  });

export type CardData = z.infer<typeof CardDataSchema>;

const cell = z
  .number()
  .int()
  .min(0)
  .max(BOARD_CELLS - 1);

/**
 * Schéma des coups reçus du client (validation structurelle). L'existence des cartes et la
 * légalité sont vérifiées ensuite par le moteur (`validateMove`).
 */
export const MoveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('usePrivileges'), cells: z.array(cell).min(1).max(3) }).strict(),
  z.object({ type: z.literal('replenish') }).strict(),
  z.object({ type: z.literal('takeTokens'), cells: z.array(cell).min(1).max(3) }).strict(),
  z.object({ type: z.literal('reserve'), goldCell: cell, cardId: id }).strict(),
  z.object({ type: z.literal('reserveDeck'), goldCell: cell, level }).strict(),
  z.object({ type: z.literal('buy'), cardId: id }).strict(),
  z.object({ type: z.literal('jokerColor'), color: gemColor }).strict(),
  z.object({ type: z.literal('abilityToken'), cell }).strict(),
  z.object({ type: z.literal('steal'), color: takeableColor }).strict(),
  z.object({ type: z.literal('chooseRoyal'), royalId: id }).strict(),
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
