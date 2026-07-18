/**
 * repair() — the heart of the engine.
 *
 * Given a palette proposed by the LLM, make every foreground token satisfy its
 * contrast rules by adjusting ONLY its lightness (`l`), never its hue or chroma.
 * Because it moves only `l`, repair is minimal, deterministic, and
 * harmony-preserving by construction.
 *
 * The algorithm, per token:
 *   1. Each contrast rule, against a fixed background, defines a monotone contrast
 *      curve in `l`. The set of `l` that satisfies it is a half-interval found by
 *      binary search — either [0, τ] (token darker than bg) or [τ, 1] (lighter).
 *   2. Intersect the half-intervals of all the token's rules → a single feasible
 *      window [lo, hi].
 *   3. Project the proposed `l` onto that window (nearest point). If it already
 *      passed, the projection is a no-op (ΔL = 0). If it failed, it snaps to the
 *      closest boundary — the provably smallest change that satisfies every rule.
 *   4. If the window is empty, no lightness can satisfy all rules at this hue and
 *      chroma. The token is reported `infeasible` (honest), and we fall back to the
 *      lightness that maximizes the worst-case contrast.
 */

import type {
  ConstraintInterval,
  ContrastRule,
  OKLCH,
  Palette,
  RepairResult,
  RepairStep,
  TokenName,
} from './types';
import { contrastRatio, luminance, luminanceAtL } from './contrast';
import { FOREGROUND_TOKENS, rulesAreDisjoint, rulesForToken } from './rules';

/** Aim slightly above the required ratio so exports/rounding keep the guarantee. */
const TARGET_MARGIN = 0.02;
/** Binary-search iterations — resolves `l` far below perceptual precision. */
const ITERS = 54;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Contrast between a token at lightness `l` (fixed c,h) and a fixed background luminance. */
function contrastAt(c: number, h: number, l: number, bgLum: number): number {
  return contrastRatio(luminanceAtL(c, h, l), bgLum);
}

/** Lightness where the token's luminance equals the background's (contrast crossover). */
function findCrossover(c: number, h: number, bgLum: number): number {
  const lum0 = luminanceAtL(c, h, 0);
  const lum1 = luminanceAtL(c, h, 1);
  if (bgLum <= lum0) return 0; // token is lighter than bg for all l
  if (bgLum >= lum1) return 1; // token is darker than bg for all l
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (luminanceAtL(c, h, mid) < bgLum) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** Largest `l` in [0, crossover] whose contrast ≥ target (darker-than-bg side). */
function solveDarkerMaxL(
  c: number,
  h: number,
  bgLum: number,
  target: number,
  cross: number,
): number {
  let lo = 0;
  let hi = cross;
  for (let i = 0; i < ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (contrastAt(c, h, mid, bgLum) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Smallest `l` in [crossover, 1] whose contrast ≥ target (lighter-than-bg side). */
function solveLighterMinL(
  c: number,
  h: number,
  bgLum: number,
  target: number,
  cross: number,
): number {
  let lo = cross;
  let hi = 1;
  for (let i = 0; i < ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (contrastAt(c, h, mid, bgLum) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

interface RuleFeasibility {
  rule: ContrastRule;
  bgLum: number;
  /** Feasible window on the darker side [0, τ], or null if unreachable. */
  darker: [number, number] | null;
  /** Feasible window on the lighter side [τ, 1], or null if unreachable. */
  lighter: [number, number] | null;
}

/** Compute both feasible half-intervals a single rule imposes on a token's lightness. */
function ruleFeasibility(color: OKLCH, bg: OKLCH, rule: ContrastRule): RuleFeasibility {
  const { c, h } = color;
  const bgLum = luminance(bg);
  const target = rule.min + TARGET_MARGIN;
  const cross = findCrossover(c, h, bgLum);

  const darker: [number, number] | null =
    contrastAt(c, h, 0, bgLum) >= target
      ? [0, solveDarkerMaxL(c, h, bgLum, target, cross)]
      : null;

  const lighter: [number, number] | null =
    contrastAt(c, h, 1, bgLum) >= target
      ? [solveLighterMinL(c, h, bgLum, target, cross), 1]
      : null;

  return { rule, bgLum, darker, lighter };
}

/** Worst-case contrast of a token (at lightness `l`) across all its rules. */
function worstContrast(
  color: OKLCH,
  l: number,
  feas: RuleFeasibility[],
): { ratio: number; rule: ContrastRule | null } {
  let ratio = Infinity;
  let rule: ContrastRule | null = null;
  for (const f of feas) {
    const r = contrastAt(color.c, color.h, l, f.bgLum);
    if (r < ratio) {
      ratio = r;
      rule = f.rule;
    }
  }
  return { ratio: rule ? ratio : 21, rule };
}

/** Fallback for infeasible tokens: lightness that maximizes the worst-case deficit. */
function bestEffortL(color: OKLCH, feas: RuleFeasibility[]): number {
  let bestL = color.l;
  let bestScore = -Infinity;
  const scan = (from: number, to: number, steps: number) => {
    for (let k = 0; k <= steps; k++) {
      const l = from + ((to - from) * k) / steps;
      let score = Infinity;
      for (const f of feas) {
        score = Math.min(score, contrastAt(color.c, color.h, l, f.bgLum) - f.rule.min);
      }
      if (score > bestScore) {
        bestScore = score;
        bestL = l;
      }
    }
  };
  scan(0, 1, 200); // coarse pass
  scan(Math.max(0, bestL - 0.01), Math.min(1, bestL + 0.01), 40); // local refine
  return bestL;
}

/** Repair one foreground token against the (fixed) anchor palette. */
function repairToken(token: TokenName, palette: Palette): RepairStep {
  const color = palette[token];
  const rules = rulesForToken(token);
  const feas = rules.map((r) => ruleFeasibility(color, palette[r.bg], r));

  const before = worstContrast(color, color.l, feas);
  const passedBefore = feas.every(
    (f) => contrastAt(color.c, color.h, color.l, f.bgLum) >= f.rule.min,
  );

  let repairedL: number;
  let infeasible = false;
  if (passedBefore) {
    // Never touch a token that already satisfies every rule.
    repairedL = color.l;
  } else {
    // Candidate 1: keep the token darker than every background.
    let darkCandidate: number | null = null;
    if (feas.every((f) => f.darker)) {
      const hi = Math.min(...feas.map((f) => f.darker![1]));
      darkCandidate = clamp01(Math.min(color.l, hi)); // project onto [0, hi]
    }

    // Candidate 2: keep the token lighter than every background.
    let lightCandidate: number | null = null;
    if (feas.every((f) => f.lighter)) {
      const lo = Math.max(...feas.map((f) => f.lighter![0]));
      lightCandidate = clamp01(Math.max(color.l, lo)); // project onto [lo, 1]
    }

    if (darkCandidate !== null && lightCandidate !== null) {
      // Both polarities work — pick the smaller lightness change.
      repairedL =
        Math.abs(darkCandidate - color.l) <= Math.abs(lightCandidate - color.l)
          ? darkCandidate
          : lightCandidate;
    } else if (darkCandidate !== null) {
      repairedL = darkCandidate;
    } else if (lightCandidate !== null) {
      repairedL = lightCandidate;
    } else {
      infeasible = true;
      repairedL = bestEffortL(color, feas);
    }
  }

  const repairedColor: OKLCH = { l: repairedL, c: color.c, h: color.h };
  const after = worstContrast(repairedColor, repairedL, feas);
  const passedAfter = feas.every(
    (f) => contrastAt(color.c, color.h, repairedL, f.bgLum) >= f.rule.min,
  );

  const constraints: ConstraintInterval[] = feas.map((f) => ({
    rule: f.rule,
    feasible: f.darker ?? f.lighter ?? [Number.NaN, Number.NaN],
  }));

  return {
    token,
    bindingRule: after.rule,
    proposedL: color.l,
    proposedRatio: before.ratio,
    passedBefore,
    repairedL,
    repairedRatio: after.ratio,
    passedAfter,
    deltaL: repairedL - color.l,
    constraints,
    infeasible,
  };
}

/**
 * Repair a full palette. Anchor tokens pass through untouched; every foreground
 * token is adjusted in lightness only. Returns the repaired palette, a per-token
 * trace, and the list of tokens that could not be fully satisfied.
 */
export function repair(palette: Palette): RepairResult {
  // With the current rules, foregrounds and backgrounds are disjoint, so each
  // foreground can be solved independently against fixed anchors. If that ever
  // stops being true, this repair would need a topological resolution order.
  if (!rulesAreDisjoint()) {
    throw new Error(
      'repair(): rules introduce a foreground that is also a background; ' +
        'a topological resolution order is required.',
    );
  }

  const repaired: Palette = { ...palette };
  const trace: RepairStep[] = [];
  const infeasible: TokenName[] = [];

  for (const token of FOREGROUND_TOKENS) {
    const step = repairToken(token, palette);
    repaired[token] = {
      l: step.repairedL,
      c: palette[token].c,
      h: palette[token].h,
    };
    trace.push(step);
    if (step.infeasible) infeasible.push(token);
  }

  return { palette: repaired, trace, infeasible };
}
