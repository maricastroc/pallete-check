/**
 * The constitution of the system.
 *
 * Every accessibility constraint the engine enforces lives here as data. These
 * rules are hardcoded and objective — they NEVER come from the LLM. The LLM owns
 * hue, chroma and identity; this file owns what "accessible" means.
 */

import type { ContrastRule, HarmonyScheme, TokenName } from './types';
import { thresholdFor } from './wcag';

/** Canonical token order — drives stable, human-readable export output. */
export const ALL_TOKENS: readonly TokenName[] = [
  'bg',
  'surface',
  'surfaceElevated',
  'text',
  'textSecondary',
  'textDisabled',
  'primary',
  'primaryHover',
  'primaryActive',
  'onPrimary',
  'danger',
  'warning',
  'success',
  'info',
  'border',
  'borderStrong',
  'focusRing',
  'selection',
];

/** Shorthand builder so the rule table stays readable. */
function rule(
  fg: TokenName,
  bg: TokenName,
  kind: ContrastRule['kind'],
  level: ContrastRule['level'],
): ContrastRule {
  return { fg, bg, kind, level, min: thresholdFor(kind, level) };
}

/**
 * The full contrast rule table.
 *
 * Multi-constraint tokens are the interesting cases:
 *   - `text` must pass against bg, surface, surfaceElevated AND selection.
 *   - `onPrimary` must pass against primary AND its hover/active states.
 * `repair` resolves all constraints on a token simultaneously (see repair.ts).
 */
export const RULES: readonly ContrastRule[] = [
  // Body text — legible on every surface it can land on.
  rule('text', 'bg', 'text', 'AA'),
  rule('text', 'surface', 'text', 'AA'),
  rule('text', 'surfaceElevated', 'text', 'AA'),
  rule('text', 'selection', 'text', 'AA'),

  // Secondary text — same legibility bar, muted color is the LLM's job, not a lower rule.
  rule('textSecondary', 'bg', 'text', 'AA'),
  rule('textSecondary', 'surface', 'text', 'AA'),
  rule('textSecondary', 'surfaceElevated', 'text', 'AA'),

  // Disabled text: WCAG exempts it entirely. We deliberately hold it to the
  // large-text bar (3:1) — muted, but never invisible. A documented policy choice.
  rule('textDisabled', 'surface', 'largeText', 'AA'),

  // Label on the primary button, across all three interaction states.
  rule('onPrimary', 'primary', 'text', 'AA'),
  rule('onPrimary', 'primaryHover', 'text', 'AA'),
  rule('onPrimary', 'primaryActive', 'text', 'AA'),

  // Status colors used as text/icons on a surface.
  rule('danger', 'surface', 'text', 'AA'),
  rule('warning', 'surface', 'text', 'AA'),
  rule('success', 'surface', 'text', 'AA'),
  rule('info', 'surface', 'text', 'AA'),

  // Structure — non-text UI components need 3:1 to be perceivable (SC 1.4.11).
  rule('border', 'surface', 'ui', 'AA'),
  rule('borderStrong', 'surface', 'ui', 'AA'),
  rule('focusRing', 'surface', 'ui', 'AA'),
  rule('focusRing', 'bg', 'ui', 'AA'),
];

/**
 * Tokens the engine never repairs. These are the "ground" of the design — their
 * color is the LLM's identity decision, and every foreground token is measured
 * against them. Repair adjusts foregrounds to fit these, not the other way around.
 */
export const ANCHOR_TOKENS: readonly TokenName[] = [
  'bg',
  'surface',
  'surfaceElevated',
  'primary',
  'primaryHover',
  'primaryActive',
  'selection',
];

/** Every token that appears as a foreground in some rule (i.e. gets repaired). */
export const FOREGROUND_TOKENS: readonly TokenName[] = Array.from(
  new Set(RULES.map((r) => r.fg)),
);

/** All rules where `token` is the foreground. */
export function rulesForToken(token: TokenName): ContrastRule[] {
  return RULES.filter((r) => r.fg === token);
}

/**
 * Invariant guard: with the current rules, foreground and anchor (background)
 * token sets are disjoint, so every foreground can be repaired independently
 * against fixed anchors — no dependency ordering needed. If a future rule makes
 * a repaired token also serve as a background, this returns false and the repair
 * step would need a topological resolution order. Tests assert this holds.
 */
export function rulesAreDisjoint(): boolean {
  const fg = new Set<TokenName>(RULES.map((r) => r.fg));
  const bg = new Set<TokenName>(RULES.map((r) => r.bg));
  for (const t of fg) if (bg.has(t)) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Harmony specs
// ─────────────────────────────────────────────────────────────────────────────

/** Below this chroma a color is effectively neutral and exempt from harmony. */
export const CHROMA_EPS = 0.02;

interface HarmonySpec {
  /** Allowed hue anchors, as offsets (degrees) from the base hue. */
  offsets: number[];
  /** Maximum angular distance (degrees) from the nearest anchor. */
  tolerance: number;
}

const HARMONY_SPECS: Record<HarmonyScheme, HarmonySpec> = {
  monochromatic: { offsets: [0], tolerance: 6 },
  analogous: { offsets: [0], tolerance: 40 },
  complementary: { offsets: [0, 180], tolerance: 15 },
  triadic: { offsets: [0, 120, 240], tolerance: 15 },
};

/** Allowed hue anchors for a scheme given a base hue, normalized to [0, 360). */
export function allowedHues(scheme: HarmonyScheme, baseHue: number): number[] {
  return HARMONY_SPECS[scheme].offsets.map((o) => ((baseHue + o) % 360 + 360) % 360);
}

export function harmonyTolerance(scheme: HarmonyScheme): number {
  return HARMONY_SPECS[scheme].tolerance;
}
