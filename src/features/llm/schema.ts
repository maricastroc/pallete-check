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

// Airtight bounds at the boundary, matching the ranges the SYSTEM_PROMPT gives
// the model (l 0–1, c 0–0.37, h 0–360). materialize.sanitize stays as the second
// line of defense — it still gamut-clamps and normalizes for callers (e.g. the
// mock, the tuner) that don't pass through this schema.
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

export const GenerateInputSchema = z.object({
  productType: z.string().min(1).max(200),
  vibe: z.string().max(200).optional().default(''),
  scheme: z.enum(HARMONY_SCHEMES),
});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
