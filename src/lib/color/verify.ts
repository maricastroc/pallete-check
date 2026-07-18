/**
 * verify() — measure a palette against the rule table. Pure, read-only.
 *
 * This is the "guarantee" side of the pipeline: it never changes color, it only
 * reports the truth. Both the pre-repair and post-repair audits come from here.
 */

import type {
  ConstraintResult,
  ContrastRule,
  Palette,
  Theme,
  VerifyReport,
} from './types';
import { contrast } from './contrast';
import { RULES } from './rules';
import { meetsAA, meetsAAA, meetsLevel } from './wcag';

/** Evaluate a single rule against a palette. */
export function checkRule(palette: Palette, rule: ContrastRule): ConstraintResult {
  const ratio = contrast(palette[rule.fg], palette[rule.bg]);
  return {
    rule,
    ratio,
    passAA: meetsAA(ratio, rule.kind),
    passAAA: meetsAAA(ratio, rule.kind),
    passRequired: meetsLevel(ratio, rule.kind, rule.level),
  };
}

/**
 * Audit a full palette against every rule.
 * `passes` is true iff every rule meets its own required level.
 */
export function verify(
  palette: Palette,
  theme: Theme,
  rules: readonly ContrastRule[] = RULES,
): VerifyReport {
  const results = rules.map((r) => checkRule(palette, r));
  return {
    theme,
    results,
    passes: results.every((r) => r.passRequired),
  };
}
