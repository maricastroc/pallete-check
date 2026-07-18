/**
 * WCAG 2.1 contrast — relative luminance and contrast ratio.
 *
 * Contrast is defined on sRGB, so OKLCH colors are converted (gamut-clipped)
 * before measurement. `relativeLuminance` follows the WCAG spec literally so that
 * `contrast(black, white) === 21` and results match audit tools exactly.
 */

import type { OKLCH, SRGB } from './types';
import { oklchToSrgb } from './oklch';

/** WCAG channel linearization (note: WCAG uses the 0.03928 threshold). */
function channelLuminance(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a gamma-encoded sRGB color (channels [0, 1]). */
export function relativeLuminance({ r, g, b }: SRGB): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** Relative luminance of an OKLCH color (gamut-clipped to sRGB first). */
export function luminance(color: OKLCH): number {
  return relativeLuminance(oklchToSrgb(color));
}

/** WCAG contrast ratio from two relative luminances. Order-independent. */
export function contrastRatio(lumA: number, lumB: number): number {
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG contrast ratio between two OKLCH colors. Range [1, 21]. */
export function contrast(a: OKLCH, b: OKLCH): number {
  return contrastRatio(luminance(a), luminance(b));
}

/**
 * Relative luminance of a color at a specific lightness `l`, holding `c` and `h`.
 * This is the function the repair search inverts. It is monotonically increasing
 * in `l` (for fixed c, h), which is what makes binary search valid.
 */
export function luminanceAtL(c: number, h: number, l: number): number {
  return luminance({ l, c, h });
}
