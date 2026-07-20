import type { HarmonyScheme } from '@/lib/color';
import type { GenerateInput } from '@/features/llm/schema';

/**
 * Versioned golden prompt set. Bump the version whenever the cases change so
 * reports from different model/version runs stay comparable (or explicitly not).
 */
export const GOLDEN_SET_VERSION = '1.0.0';

export interface GoldenCase extends GenerateInput {
  id: string;
}

/**
 * Curated sweep: 24 cells across productType × vibe × scheme.
 * - each of the 8 product types appears 3×,
 * - each of the 4 harmony schemes appears 6× (enough to score B1 per scheme),
 * - product types are chosen to spread hue expectations (finance→trust blues,
 *   kids→bright warm, luxury→dark muted, dev tool→neutral) so the distinctiveness
 *   and status-convention metrics have signal.
 */
const SWEEP_CELLS: ReadonlyArray<[string, string, HarmonyScheme]> = [
  ['fintech dashboard', 'trustworthy', 'complementary'],
  ['fintech dashboard', 'focused', 'monochromatic'],
  ['fintech dashboard', 'premium', 'analogous'],

  ['meditation app', 'calm', 'analogous'],
  ['meditation app', 'serene', 'monochromatic'],
  ['meditation app', 'warm', 'complementary'],

  ['developer CLI tool', 'focused', 'monochromatic'],
  ['developer CLI tool', 'minimal', 'complementary'],
  ['developer CLI tool', 'technical', 'triadic'],

  ["children's learning app", 'playful', 'triadic'],
  ["children's learning app", 'energetic', 'complementary'],
  ["children's learning app", 'cheerful', 'analogous'],

  ['luxury fashion store', 'premium', 'monochromatic'],
  ['luxury fashion store', 'elegant', 'analogous'],
  ['luxury fashion store', 'bold', 'triadic'],

  ['healthcare patient portal', 'clinical', 'complementary'],
  ['healthcare patient portal', 'calm', 'analogous'],
  ['healthcare patient portal', 'trustworthy', 'triadic'],

  ['music streaming service', 'energetic', 'triadic'],
  ['music streaming service', 'bold', 'complementary'],
  ['music streaming service', 'vibrant', 'monochromatic'],

  ['B2B analytics SaaS', 'professional', 'analogous'],
  ['B2B analytics SaaS', 'focused', 'triadic'],
  ['B2B analytics SaaS', 'trustworthy', 'monochromatic'],
];

const toCase = (
  [productType, vibe, scheme]: readonly [string, string, HarmonyScheme],
  i: number,
  prefix: string,
): GoldenCase => ({
  id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
  productType,
  vibe,
  scheme,
});

export const SWEEP: readonly GoldenCase[] = SWEEP_CELLS.map((c, i) =>
  toCase(c, i, 'sweep'),
);

/**
 * Variance subset: run each of these N times at temperature > 0 to measure how
 * stable the model's creative contribution is. Deliberately small — variance is
 * N× the calls — and spread across three schemes with very different hue expectations.
 */
const VARIANCE_CELLS: ReadonlyArray<[string, string, HarmonyScheme]> = [
  ['fintech dashboard', 'trustworthy', 'complementary'],
  ["children's learning app", 'playful', 'triadic'],
  ['luxury fashion store', 'premium', 'monochromatic'],
];

export const VARIANCE = {
  repeats: 8,
  cases: VARIANCE_CELLS.map((c, i) => toCase(c, i, 'var')),
} as const;
