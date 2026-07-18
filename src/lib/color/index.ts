/**
 * @module lib/color
 *
 * The deterministic color engine. Pure, framework-free, dependency-free.
 *
 * Philosophy: "LLM proposes. Math guarantees."
 * The LLM owns hue, chroma, and identity. This engine owns luminance, contrast,
 * verification, repair, and export — and it repairs by moving lightness only, so
 * it can never alter the identity or the harmony it was handed.
 *
 * Pipeline: materialize → verify → repair → verify → checkHarmony → export
 */

export * from './types';

// Color space
export {
  oklchToSrgb,
  oklchToSrgbRaw,
  srgbToOklch,
  oklchToHex,
  hexToOklch,
  oklchToCss,
  isInGamut,
  clampChromaToGamut,
} from './oklch';

// Contrast
export {
  contrast,
  contrastRatio,
  luminance,
  relativeLuminance,
  luminanceAtL,
} from './contrast';

// WCAG thresholds
export { thresholdFor, meetsAA, meetsAAA, meetsLevel } from './wcag';

// Rules (the constitution)
export {
  RULES,
  ALL_TOKENS,
  ANCHOR_TOKENS,
  FOREGROUND_TOKENS,
  rulesForToken,
  rulesAreDisjoint,
  allowedHues,
  harmonyTolerance,
  CHROMA_EPS,
} from './rules';

// Pipeline
export { verify, checkRule } from './verify';
export { repair } from './repair';
export { checkHarmony, hueDistance } from './harmony';

// Export formats
export {
  toCssVariables,
  toJson,
  toTokensObject,
  toTailwindConfig,
  toDesignTokens,
  exportAs,
} from './export';
export type { ExportFormat } from './export';
