/**
 * OKLCH ↔ sRGB conversions and gamut handling — pure math, zero dependencies.
 *
 * Uses Björn Ottosson's canonical OKLab matrices. All functions are pure.
 * The engine manipulates color in OKLCH; sRGB is only produced at the edges
 * (contrast measurement, hex export).
 */

import type { OKLCH, SRGB } from './types';

const clamp = (x: number, lo: number, hi: number): number =>
  x < lo ? lo : x > hi ? hi : x;

/** sRGB gamma transfer: linear channel → gamma-encoded, both in [0, 1]. */
function linearToGamma(x: number): number {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

/** sRGB inverse gamma: gamma-encoded channel → linear. */
function gammaToLinear(x: number): number {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** OKLCH → OKLab (polar → cartesian). */
function oklchToOklab({ l, c, h }: OKLCH): { L: number; a: number; b: number } {
  const rad = (h * Math.PI) / 180;
  return { L: l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

/** OKLab → OKLCH (cartesian → polar). Hue normalized to [0, 360). */
function oklabToOklch(L: number, a: number, b: number): OKLCH {
  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Collapse hue noise for achromatic colors.
  if (c < 1e-7) h = 0;
  return { l: L, c, h };
}

/**
 * OKLCH → linear sRGB. Channels may fall outside [0, 1] when the color is
 * out of the sRGB gamut; callers decide whether to clip or gamut-map.
 */
function oklchToLinearRgb(color: OKLCH): { r: number; g: number; b: number } {
  const { L, a, b } = oklchToOklab(color);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** Linear sRGB → OKLCH. */
function linearRgbToOklch(r: number, g: number, b: number): OKLCH {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return oklabToOklch(L, a, bb);
}

/**
 * OKLCH → gamma-encoded sRGB. Returns raw channels which may be outside [0, 1]
 * when out of gamut (use {@link isInGamut} / {@link clampChromaToGamut} first if
 * you need a displayable value).
 */
export function oklchToSrgbRaw(color: OKLCH): SRGB {
  const { r, g, b } = oklchToLinearRgb(color);
  return { r: linearToGamma(r), g: linearToGamma(g), b: linearToGamma(b) };
}

/** OKLCH → displayable sRGB, channels clipped to [0, 1]. */
export function oklchToSrgb(color: OKLCH): SRGB {
  const { r, g, b } = oklchToSrgbRaw(color);
  return { r: clamp(r, 0, 1), g: clamp(g, 0, 1), b: clamp(b, 0, 1) };
}

/** Gamma-encoded sRGB (each channel [0, 1]) → OKLCH. */
export function srgbToOklch({ r, g, b }: SRGB): OKLCH {
  return linearRgbToOklch(gammaToLinear(r), gammaToLinear(g), gammaToLinear(b));
}

const GAMUT_EPS = 1e-4;

/** Whether an OKLCH color lies inside the sRGB gamut (all raw channels in [0, 1]). */
export function isInGamut(color: OKLCH): boolean {
  const { r, g, b } = oklchToSrgbRaw(color);
  const lo = -GAMUT_EPS;
  const hi = 1 + GAMUT_EPS;
  return r >= lo && r <= hi && g >= lo && g <= hi && b >= lo && b <= hi;
}

/**
 * Bring a color into the sRGB gamut by reducing chroma only, preserving L and H.
 * Binary search on `c` — the CSS Color 4 gamut-mapping strategy. This is the ONE
 * place the engine touches chroma, and it's a deterministic pre-step (part of
 * `materialize`), never part of `repair`.
 */
export function clampChromaToGamut(color: OKLCH): OKLCH {
  if (isInGamut(color)) return color;

  let lo = 0;
  let hi = color.c;
  // 40 iterations resolves chroma far below display precision.
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (isInGamut({ l: color.l, c: mid, h: color.h })) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { l: color.l, c: lo, h: color.h };
}

const to255 = (x: number): number => Math.round(clamp(x, 0, 1) * 255);

/** OKLCH → `#rrggbb` (gamut-clipped). */
export function oklchToHex(color: OKLCH): string {
  const { r, g, b } = oklchToSrgb(color);
  const hex = (n: number) => to255(n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** `#rgb` / `#rrggbb` → OKLCH. Throws on malformed input. */
export function hexToOklch(hex: string): OKLCH {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: "${hex}"`);
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return srgbToOklch({ r, g, b });
}

/** Format an OKLCH color as a CSS `oklch()` string. */
export function oklchToCss({ l, c, h }: OKLCH): string {
  const L = (l * 100).toFixed(2);
  const C = c.toFixed(4);
  const H = h.toFixed(2);
  return `oklch(${L}% ${C} ${H})`;
}
