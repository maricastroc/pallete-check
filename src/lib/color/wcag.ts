/**
 * WCAG 2.1 contrast thresholds.
 *
 * These numbers are the objective ground truth of the system. They are encoded
 * here and referenced by `rules.ts` — they are never provided by the LLM.
 */

import type { ContrastKind, WcagLevel } from './types';

/** Minimum contrast ratio for each (kind, level) pair, per WCAG 2.1 SC 1.4.3 / 1.4.6 / 1.4.11. */
const THRESHOLDS: Record<ContrastKind, Record<WcagLevel, number>> = {
  // Normal text
  text: { AA: 4.5, AAA: 7 },
  // Large text (≥ 18pt, or 14pt bold)
  largeText: { AA: 3, AAA: 4.5 },
  // Non-text UI components & graphical objects (borders, focus rings, icons).
  // WCAG defines a single 3:1 bar (SC 1.4.11); we mirror it at AAA for a uniform API.
  ui: { AA: 3, AAA: 3 },
};

/** The minimum contrast ratio required for a given kind + level. */
export function thresholdFor(kind: ContrastKind, level: WcagLevel): number {
  return THRESHOLDS[kind][level];
}

/** Does this ratio meet AA for the given kind? */
export function meetsAA(ratio: number, kind: ContrastKind): boolean {
  return ratio >= THRESHOLDS[kind].AA;
}

/** Does this ratio meet AAA for the given kind? */
export function meetsAAA(ratio: number, kind: ContrastKind): boolean {
  return ratio >= THRESHOLDS[kind].AAA;
}

/** Does this ratio meet the given level for the given kind? */
export function meetsLevel(
  ratio: number,
  kind: ContrastKind,
  level: WcagLevel,
): boolean {
  return ratio >= THRESHOLDS[kind][level];
}
