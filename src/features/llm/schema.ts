import { z } from 'zod';
import type { TokenName } from '@/lib/color';

export const CORE_TOKENS = [
  'bg',
  'surface',
  'surfaceElevated',
  'text',
  'textSecondary',
  'primary',
  'onPrimary',
  'danger',
  'warning',
  'success',
  'info',
  'focusRing',
  'selection',
] as const satisfies readonly TokenName[];

export type CoreToken = (typeof CORE_TOKENS)[number];

const ColorSchema = z.object({
  l: z.number().min(0).max(1),
  c: z.number().min(0).max(0.37),
  h: z.number().min(0).max(360),
});

const CorePaletteSchema = z.object(
  Object.fromEntries(CORE_TOKENS.map((t) => [t, ColorSchema])) as Record<
    CoreToken,
    typeof ColorSchema
  >,
);

export const HARMONY_SCHEMES = [
  'analogous',
  'complementary',
  'triadic',
  'monochromatic',
] as const;

export const ProposalSchema = z.object({
  name: z.string(),
  rationale: z.string(),
  scheme: z.enum(HARMONY_SCHEMES),
  light: CorePaletteSchema,
  dark: CorePaletteSchema,
});

export type Proposal = z.infer<typeof ProposalSchema>;
export type CorePalette = z.infer<typeof CorePaletteSchema>;

/**
 * The model's escape hatch. When the product description is empty, meaningless,
 * or not something it can design for, it returns this instead of inventing a
 * palette — the same "honest at the edges" stance as the engine's `infeasible`.
 */
export const RefusalSchema = z.object({
  usable: z.literal(false),
  reason: z.string().min(1).max(300),
});

export type Refusal = z.infer<typeof RefusalSchema>;

/**
 * Cheap, deterministic "is there anything to design for here?" guard for the
 * trivial cases only — empty, too short, no letters, or a single repeated
 * character. It deliberately does NOT try to detect semantic gibberish like
 * "dssadsadsa" (that would false-positive on real short names like "Vim" or
 * "n8n"); that judgment is the model's, via RefusalSchema.
 */
export function isPlausibleProductType(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 2) return false;
  if (!/\p{L}/u.test(s)) return false;
  return new Set(s.replace(/\s+/g, '')).size >= 2;
}

export const GenerateInputSchema = z.object({
  productType: z
    .string()
    .min(1)
    .max(200)
    .refine(isPlausibleProductType, {
      message: 'Describe a real product — e.g. “a calm meditation app”.',
    }),
  vibe: z.string().max(200).optional().default(''),
  scheme: z.enum(HARMONY_SCHEMES),
});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
