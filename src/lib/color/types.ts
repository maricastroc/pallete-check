/**
 * Core types for the deterministic color engine.
 *
 * The engine's currency is OKLCH — the only color model that cleanly separates
 * the three quantities the system cares about:
 *   - `h` (hue)    → identity, owned by the LLM
 *   - `c` (chroma) → intensity, owned by the LLM (clamped to gamut by `materialize`)
 *   - `l` (lightness) → the ONLY axis `repair` is allowed to touch
 *
 * Because repair moves only `l`, and harmony lives entirely in `h`, repair is
 * harmony-preserving by construction. That invariant is the heart of the engine.
 */

/** A color in the OKLCH space. */
export interface OKLCH {
  /** Perceptual lightness, 0 (black) → 1 (white). */
  l: number;
  /** Chroma (colorfulness), 0 → ~0.4 in sRGB. Never negative. */
  c: number;
  /** Hue angle in degrees, [0, 360). */
  h: number;
}

/** A color in gamma-encoded sRGB, each channel in [0, 1]. */
export interface SRGB {
  r: number;
  g: number;
  b: number;
}

/** The full set of semantic design tokens the system produces. */
export type TokenName =
  // Surfaces (anchors — never repaired, only referenced)
  | 'bg'
  | 'surface'
  | 'surfaceElevated'
  // Text
  | 'text'
  | 'textSecondary'
  | 'textDisabled'
  // Brand
  | 'primary'
  | 'primaryHover'
  | 'primaryActive'
  | 'onPrimary'
  // Status
  | 'danger'
  | 'warning'
  | 'success'
  | 'info'
  // Structure
  | 'border'
  | 'borderStrong'
  | 'focusRing'
  | 'selection';

/** A complete palette: one OKLCH color per semantic token. */
export type Palette = Record<TokenName, OKLCH>;

/** Light + dark, the two themes the product always generates together. */
export type Theme = 'light' | 'dark';

export interface ThemeSet {
  light: Palette;
  dark: Palette;
}

/** What a contrast constraint is measuring — decides the threshold. */
export type ContrastKind = 'text' | 'largeText' | 'ui';

/** WCAG conformance levels. */
export type WcagLevel = 'AA' | 'AAA';

/**
 * A single hardcoded contrast constraint: foreground `fg` must maintain at least
 * `min` contrast against background `bg`. These rules are the constitution of the
 * system — they live only in `rules.ts` and NEVER come from the LLM.
 */
export interface ContrastRule {
  fg: TokenName;
  bg: TokenName;
  kind: ContrastKind;
  /** Level this rule is required to satisfy. */
  level: WcagLevel;
  /** Minimum contrast ratio (derived from kind+level, kept explicit for auditability). */
  min: number;
}

/** Result of checking one rule against a concrete palette. */
export interface ConstraintResult {
  rule: ContrastRule;
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
  /** Whether the rule's own required level is met. */
  passRequired: boolean;
}

/** Full audit of one theme against all applicable rules. */
export interface VerifyReport {
  theme: Theme;
  results: ConstraintResult[];
  /** True iff every rule meets its required level. */
  passes: boolean;
}

/** The feasible `l` window a single rule imposes on a token. */
export interface ConstraintInterval {
  rule: ContrastRule;
  /** [lo, hi] range of `l` values that satisfy this rule; may be empty (lo > hi). */
  feasible: [number, number];
}

/** One token's repair story — the raw material for the Repair Trace UI. */
export interface RepairStep {
  token: TokenName;
  /** The rule that ended up binding the token's lightness (worst-case). */
  bindingRule: ContrastRule | null;
  proposedL: number;
  proposedRatio: number;
  passedBefore: boolean;
  repairedL: number;
  repairedRatio: number;
  passedAfter: boolean;
  deltaL: number;
  /** Per-rule feasible windows, for full transparency. */
  constraints: ConstraintInterval[];
  /** True when no single `l` can satisfy all constraints (hue/chroma would have to change). */
  infeasible: boolean;
}

export interface RepairResult {
  palette: Palette;
  trace: RepairStep[];
  /** Tokens the engine could not fully repair by moving lightness alone. */
  infeasible: TokenName[];
}

/** Color-harmony schemes the LLM can be asked to follow. */
export type HarmonyScheme =
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'monochromatic';

export interface HarmonyDeviation {
  token: TokenName;
  actualHue: number;
  /** Nearest hue the scheme allows. */
  expectedHue: number;
  /** Angular distance to `expectedHue`, in degrees. */
  delta: number;
}

export interface HarmonyReport {
  scheme: HarmonyScheme;
  /** Tolerance in degrees used for the check. */
  tolerance: number;
  ok: boolean;
  /** Tokens whose hue falls outside tolerance. */
  deviations: HarmonyDeviation[];
}
