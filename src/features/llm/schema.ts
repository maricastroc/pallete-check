/**
 * The LLM contract.
 *
 * The model proposes the CREATIVE core of a palette — hues, chroma, and its
 * lightness intent per theme — for a fixed set of core tokens. It never sees
 * contrast thresholds; accessibility is the engine's job. `materialize` then
 * derives the remaining tokens deterministically, and repair guarantees contrast.
 *
 * Numeric fields are intentionally loose (plain numbers) so a slightly
 * out-of-range value from the model never throws on parse — `materialize`
 * clamps everything into gamut and range.
 */

import { z } from 'zod';
import type { TokenName } from '@/lib/color';

/** Tokens the LLM proposes directly. The rest are derived by `materialize`. */
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
  l: z.number(),
  c: z.number(),
  h: z.number(),
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

/** The full structured output we ask the model for. */
export const ProposalSchema = z.object({
  /** A short, evocative name for the palette's personality. */
  name: z.string(),
  /** One or two sentences on why these colors fit the requested context. */
  rationale: z.string(),
  scheme: z.enum(HARMONY_SCHEMES),
  light: CorePaletteSchema,
  dark: CorePaletteSchema,
});

export type Proposal = z.infer<typeof ProposalSchema>;
export type CorePalette = z.infer<typeof CorePaletteSchema>;

/** The user's request. */
export const GenerateInputSchema = z.object({
  /** e.g. "dashboard for a modern fintech", "vintage text editor". */
  productType: z.string().min(1).max(200),
  /** Optional vibe words: "minimalist", "warm", "premium"… */
  vibe: z.string().max(200).optional().default(''),
  scheme: z.enum(HARMONY_SCHEMES),
});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
