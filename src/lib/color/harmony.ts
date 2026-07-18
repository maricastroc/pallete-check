/**
 * checkHarmony() — validate that a palette's hues follow the chosen scheme.
 *
 * Harmony lives entirely in hue, which is the LLM's decision. The engine only
 * *verifies* it — it never repairs hue (that would betray the identity). And
 * because repair touches only lightness, checkHarmony(repair(x)) === checkHarmony(x):
 * repair can never break harmony. If the LLM violates the scheme, we report it
 * honestly rather than silently "fixing" it.
 */

import type {
  HarmonyDeviation,
  HarmonyReport,
  HarmonyScheme,
  Palette,
  TokenName,
} from './types';
import { allowedHues, CHROMA_EPS, harmonyTolerance } from './rules';

/** Smallest angular distance between two hues, in degrees [0, 180]. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Which tokens carry the palette's identity (are chromatic enough to have a
 * meaningful hue). Neutral tokens — surfaces, text — are exempt from harmony.
 */
function chromaticTokens(palette: Palette): TokenName[] {
  return (Object.keys(palette) as TokenName[]).filter(
    (t) => palette[t].c >= CHROMA_EPS,
  );
}

/**
 * Check a palette against a harmony scheme.
 *
 * @param baseHue Optional base hue for the scheme. Defaults to the `primary`
 *   token's hue — the brand anchor the whole scheme is built around.
 * @param tolerance Optional override for the scheme's default angular tolerance.
 */
export function checkHarmony(
  palette: Palette,
  scheme: HarmonyScheme,
  baseHue: number = palette.primary.h,
  tolerance: number = harmonyTolerance(scheme),
): HarmonyReport {
  const anchors = allowedHues(scheme, baseHue);
  const deviations: HarmonyDeviation[] = [];

  // Status colors (danger/warning/...) are semantically fixed and intentionally
  // sit outside the scheme — they're not part of the harmonic identity.
  const statusTokens = new Set<TokenName>(['danger', 'warning', 'success', 'info']);

  for (const token of chromaticTokens(palette)) {
    if (statusTokens.has(token)) continue;
    // Only judge harmony on tokens that define identity — they share the brand
    // hue family (surfaces/text are neutral and already filtered out by chroma).
    const hue = palette[token].h;

    let best = anchors[0];
    let bestDelta = hueDistance(hue, anchors[0]);
    for (const a of anchors) {
      const d = hueDistance(hue, a);
      if (d < bestDelta) {
        bestDelta = d;
        best = a;
      }
    }

    if (bestDelta > tolerance) {
      deviations.push({
        token,
        actualHue: hue,
        expectedHue: best,
        delta: bestDelta,
      });
    }
  }

  return {
    scheme,
    tolerance,
    ok: deviations.length === 0,
    deviations,
  };
}
