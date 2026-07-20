import { hueDistance } from '@/lib/color';
import { assembleResult } from '@/features/llm/generate';
import {
  CORE_TOKENS,
  HARMONY_SCHEMES,
  ProposalSchema,
  type GenerateInput,
  type Proposal,
} from '@/features/llm/schema';
import type { RawOutput } from './probe';

/**
 * Pure measurement layer. Given the raw model text for one call, it computes
 * every metric — WITHOUT re-implementing the engine: harmony/repair/audit come
 * from running the real assembleResult() pipeline; hue math reuses hueDistance.
 * evaluateCall() is deterministic, so the whole harness is unit-testable offline.
 *
 * The metrics are grouped by "what the deterministic engine does NOT already
 * guarantee" — i.e. the LLM's actual contribution:
 *   A. boundary reliability (pre-parse, pre-sanitize),
 *   B. creative-brief adherence (hue identity the engine never touches),
 *   C. engine coupling (how good a seed the model handed the solver).
 */

// ── Constants (versioned brief expectations) ────────────────────────────────

/** Range limits the SYSTEM_PROMPT gives the model: l 0–1, c 0–0.37, h 0–360. */
export const RANGE_BOUNDS = { l: 1, c: 0.37, h: 360 } as const;

/**
 * Conventional OKLCH hue families for status tokens, anchored on the values the
 * offline mock itself uses (danger 25, warning 90, success 150, info 250).
 */
export const STATUS_BANDS: Record<
  'danger' | 'warning' | 'success' | 'info',
  { center: number; tol: number }
> = {
  danger: { center: 25, tol: 22 }, // red
  warning: { center: 82, tol: 30 }, // amber / yellow-orange
  success: { center: 150, tol: 28 }, // green
  info: { center: 250, tol: 30 }, // blue
};

/** The "default purple-on-white" violet/indigo band the prompt bans. */
export const GENERIC_HUE_BAND = { lo: 265, hi: 300 } as const;

type StatusToken = keyof typeof STATUS_BANDS;

// ── Per-call metric shapes ──────────────────────────────────────────────────

export interface RangeStat {
  inRange: number;
  total: number;
}

export interface RangeMetrics {
  l: RangeStat;
  c: RangeStat;
  h: RangeStat;
  /** Fraction of all channels (l,c,h × 26 colors) already within the prompt limits. */
  overall: number;
  /** Largest amount any chroma exceeded 0.37 (0 if none) — near-miss vs. blown. */
  maxChromaOverflow: number;
}

export interface HarmonyMetrics {
  ok: boolean;
  /** Worst hue deviation (deg) beyond tolerance across both themes; 0 if ok. */
  maxDelta: number;
  deviatingTokens: string[];
}

export interface StatusMetrics {
  danger: boolean;
  warning: boolean;
  success: boolean;
  info: boolean;
  ok: boolean;
}

export interface DistinctMetrics {
  primaryHue: number;
  primaryChroma: number;
  primaryLight: number;
  avoidsGeneric: boolean;
}

export interface EngineMetrics {
  meanAbsDeltaL: number;
  maxAbsDeltaL: number;
  movedTokens: number;
  infeasibleCount: number;
  auditPasses: boolean;
}

export interface CallMetrics {
  input: GenerateInput;
  /** Transport/API error — no text came back at all. */
  errored: boolean;
  // A. boundary reliability
  jsonValid: boolean;
  shapeValid: boolean;
  shapeIssues: string[];
  /** The production gate: ProposalSchema.safeParse (structure AND, after P3, ranges). */
  strictSchemaValid: boolean;
  range: RangeMetrics | null;
  // B. creative-brief adherence
  harmony: HarmonyMetrics | null;
  status: StatusMetrics | null;
  distinct: DistinctMetrics | null;
  // C. engine coupling
  engine: EngineMetrics | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const isFiniteNumber = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x);

const asRecord = (x: unknown): Record<string, unknown> | null =>
  typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : null;

const inBand = (h: number, band: { center: number; tol: number }): boolean =>
  hueDistance(h, band.center) <= band.tol;

function checkShape(parsed: unknown): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const root = asRecord(parsed);
  if (!root) return { ok: false, issues: ['root: not an object'] };

  if (typeof root.name !== 'string') issues.push('name: not a string');
  if (typeof root.rationale !== 'string') issues.push('rationale: not a string');
  if (!(HARMONY_SCHEMES as readonly string[]).includes(root.scheme as string)) {
    issues.push('scheme: not a valid harmony scheme');
  }

  for (const theme of ['light', 'dark'] as const) {
    const pal = asRecord(root[theme]);
    if (!pal) {
      issues.push(`${theme}: not an object`);
      continue;
    }
    const missing = CORE_TOKENS.filter((t) => !(t in pal));
    const extra = Object.keys(pal).filter(
      (k) => !(CORE_TOKENS as readonly string[]).includes(k),
    );
    if (missing.length) issues.push(`${theme}: missing ${missing.join(', ')}`);
    if (extra.length) issues.push(`${theme}: extra ${extra.join(', ')}`);
    for (const t of CORE_TOKENS) {
      if (!(t in pal)) continue;
      const col = asRecord(pal[t]);
      if (!col) {
        issues.push(`${theme}.${t}: not an object`);
        continue;
      }
      for (const ch of ['l', 'c', 'h'] as const) {
        if (!isFiniteNumber(col[ch])) issues.push(`${theme}.${t}.${ch}: not a finite number`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function computeRange(p: Proposal): RangeMetrics {
  let lIn = 0;
  let cIn = 0;
  let hIn = 0;
  let total = 0;
  let maxChromaOverflow = 0;

  for (const theme of [p.light, p.dark]) {
    for (const t of CORE_TOKENS) {
      const { l, c, h } = theme[t];
      total++;
      if (l >= 0 && l <= RANGE_BOUNDS.l) lIn++;
      if (c >= 0 && c <= RANGE_BOUNDS.c) cIn++;
      else if (c > RANGE_BOUNDS.c) {
        maxChromaOverflow = Math.max(maxChromaOverflow, c - RANGE_BOUNDS.c);
      }
      if (h >= 0 && h <= RANGE_BOUNDS.h) hIn++;
    }
  }

  return {
    l: { inRange: lIn, total },
    c: { inRange: cIn, total },
    h: { inRange: hIn, total },
    overall: (lIn + cIn + hIn) / (3 * total),
    maxChromaOverflow,
  };
}

// ── evaluateCall: raw text → metrics ────────────────────────────────────────

function emptyCall(input: GenerateInput, errored: boolean): CallMetrics {
  return {
    input,
    errored,
    jsonValid: false,
    shapeValid: false,
    shapeIssues: errored ? ['transport error'] : [],
    strictSchemaValid: false,
    range: null,
    harmony: null,
    status: null,
    distinct: null,
    engine: null,
  };
}

export function evaluateCall(raw: RawOutput): CallMetrics {
  const { input } = raw;
  if (raw.rawText === null) return emptyCall(input, true);

  const base = emptyCall(input, false);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.rawText);
  } catch {
    return base; // jsonValid stays false
  }
  base.jsonValid = true;

  const shape = checkShape(parsed);
  base.shapeValid = shape.ok;
  base.shapeIssues = shape.issues;
  base.strictSchemaValid = ProposalSchema.safeParse(parsed).success;

  if (!shape.ok) return base;

  // Shape is valid → numeric l/c/h everywhere. Ranges measured on RAW numbers
  // (pre-sanitize); everything engine-side comes from the real pipeline, whose
  // sanitize() rescues any out-of-range values just like production would.
  const proposal = parsed as Proposal;
  base.range = computeRange(proposal);

  const result = assembleResult(proposal, raw.source);

  // B1 — harmony (repair preserves hue, so post-repair == the model's decision).
  const devTokens = [
    ...result.harmony.light.deviations,
    ...result.harmony.dark.deviations,
  ];
  base.harmony = {
    ok: result.harmony.light.ok && result.harmony.dark.ok,
    maxDelta: devTokens.reduce((m, d) => Math.max(m, d.delta), 0),
    deviatingTokens: Array.from(new Set(devTokens.map((d) => d.token))),
  };

  // B2 — status conventions (hue must land in the right family in BOTH themes).
  const statusOk = (token: StatusToken): boolean =>
    inBand(result.proposal.light[token].h, STATUS_BANDS[token]) &&
    inBand(result.proposal.dark[token].h, STATUS_BANDS[token]);
  const status: StatusMetrics = {
    danger: statusOk('danger'),
    warning: statusOk('warning'),
    success: statusOk('success'),
    info: statusOk('info'),
    ok: false,
  };
  status.ok = status.danger && status.warning && status.success && status.info;
  base.status = status;

  // B3a — distinctiveness (primary hue outside the generic violet/indigo band).
  const primary = result.proposal.light.primary;
  const primaryHue = ((primary.h % 360) + 360) % 360;
  base.distinct = {
    primaryHue,
    primaryChroma: primary.c,
    primaryLight: primary.l,
    avoidsGeneric: !(primaryHue >= GENERIC_HUE_BAND.lo && primaryHue <= GENERIC_HUE_BAND.hi),
  };

  // C1/C2 — repair load & infeasibility (straight from the engine's own output).
  const steps = [...result.trace.light, ...result.trace.dark];
  const absDeltas = steps.map((s) => Math.abs(s.deltaL));
  base.engine = {
    meanAbsDeltaL: mean(absDeltas),
    maxAbsDeltaL: absDeltas.reduce((m, d) => Math.max(m, d), 0),
    movedTokens: absDeltas.filter((d) => d > 1e-6).length,
    infeasibleCount: result.infeasible.light.length + result.infeasible.dark.length,
    auditPasses: result.audit.light.passes && result.audit.dark.passes,
  };

  return base;
}

// ── Aggregation ─────────────────────────────────────────────────────────────

export const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

export const std = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

const rate = (bools: boolean[]): number =>
  bools.length === 0 ? 0 : bools.filter(Boolean).length / bools.length;

/** Mean resultant length of a set of hue angles (0 = fully dispersed, 1 = identical). */
export function circResultantLength(deg: number[]): number {
  if (deg.length === 0) return 1;
  let sx = 0;
  let sy = 0;
  for (const d of deg) {
    const r = (d * Math.PI) / 180;
    sx += Math.cos(r);
    sy += Math.sin(r);
  }
  return Math.sqrt(sx * sx + sy * sy) / deg.length;
}

/** Circular standard deviation (deg) of a set of hue angles. */
export function circStdDeg(deg: number[]): number {
  const R = circResultantLength(deg);
  if (R <= 1e-9) return 180;
  return (Math.sqrt(-2 * Math.log(R)) * 180) / Math.PI;
}

export interface Aggregate {
  n: number;
  errorRate: number;
  jsonValidRate: number;
  shapeValidRate: number;
  strictSchemaRate: number;
  range: {
    overall: number;
    l: number;
    c: number;
    h: number;
    meanChromaOverflow: number;
  } | null;
  harmonyOkRate: number;
  meanHarmonyMaxDelta: number;
  statusOkRate: number;
  perStatus: { danger: number; warning: number; success: number; info: number };
  avoidsGenericRate: number;
  hueDiversityIndex: number;
  hueBinsCovered: number;
  engine: {
    meanAbsDeltaL: number;
    maxAbsDeltaL: number;
    meanInfeasible: number;
    infeasibleAnyRate: number;
    auditPassRate: number;
  } | null;
}

export function aggregate(calls: CallMetrics[]): Aggregate {
  const shaped = calls.filter((c) => c.shapeValid && c.range);
  const withHarmony = calls.filter((c) => c.harmony);
  const withStatus = calls.filter((c) => c.status);
  const withDistinct = calls.filter((c) => c.distinct);
  const withEngine = calls.filter((c) => c.engine);
  const primaryHues = withDistinct.map((c) => c.distinct!.primaryHue);

  return {
    n: calls.length,
    errorRate: rate(calls.map((c) => c.errored)),
    jsonValidRate: rate(calls.map((c) => c.jsonValid)),
    shapeValidRate: rate(calls.map((c) => c.shapeValid)),
    strictSchemaRate: rate(calls.map((c) => c.strictSchemaValid)),
    range: shaped.length
      ? {
          overall: mean(shaped.map((c) => c.range!.overall)),
          l: mean(shaped.map((c) => c.range!.l.inRange / c.range!.l.total)),
          c: mean(shaped.map((c) => c.range!.c.inRange / c.range!.c.total)),
          h: mean(shaped.map((c) => c.range!.h.inRange / c.range!.h.total)),
          meanChromaOverflow: mean(shaped.map((c) => c.range!.maxChromaOverflow)),
        }
      : null,
    harmonyOkRate: rate(withHarmony.map((c) => c.harmony!.ok)),
    meanHarmonyMaxDelta: mean(withHarmony.map((c) => c.harmony!.maxDelta)),
    statusOkRate: rate(withStatus.map((c) => c.status!.ok)),
    perStatus: {
      danger: rate(withStatus.map((c) => c.status!.danger)),
      warning: rate(withStatus.map((c) => c.status!.warning)),
      success: rate(withStatus.map((c) => c.status!.success)),
      info: rate(withStatus.map((c) => c.status!.info)),
    },
    avoidsGenericRate: rate(withDistinct.map((c) => c.distinct!.avoidsGeneric)),
    hueDiversityIndex: 1 - circResultantLength(primaryHues),
    hueBinsCovered: new Set(primaryHues.map((h) => Math.floor(h / 30))).size,
    engine: withEngine.length
      ? {
          meanAbsDeltaL: mean(withEngine.map((c) => c.engine!.meanAbsDeltaL)),
          maxAbsDeltaL: withEngine.reduce((m, c) => Math.max(m, c.engine!.maxAbsDeltaL), 0),
          meanInfeasible: mean(withEngine.map((c) => c.engine!.infeasibleCount)),
          infeasibleAnyRate: rate(withEngine.map((c) => c.engine!.infeasibleCount > 0)),
          auditPassRate: rate(withEngine.map((c) => c.engine!.auditPasses)),
        }
      : null,
  };
}

// ── Variance (same input, N repeats) ────────────────────────────────────────

export interface VarianceStat {
  id: string;
  input: GenerateInput;
  repeats: number;
  primaryHueCircStdDeg: number;
  primaryChromaStd: number;
  primaryLightStd: number;
  harmonyOkRate: number;
  statusOkRate: number;
  strictSchemaRate: number;
  rangeOverallMean: number;
  meanAbsDeltaLMean: number;
  infeasibleMean: number;
}

export function varianceStat(
  id: string,
  input: GenerateInput,
  calls: CallMetrics[],
): VarianceStat {
  const distinct = calls.filter((c) => c.distinct);
  const engine = calls.filter((c) => c.engine);
  const shaped = calls.filter((c) => c.range);
  return {
    id,
    input,
    repeats: calls.length,
    primaryHueCircStdDeg: circStdDeg(distinct.map((c) => c.distinct!.primaryHue)),
    primaryChromaStd: std(distinct.map((c) => c.distinct!.primaryChroma)),
    primaryLightStd: std(distinct.map((c) => c.distinct!.primaryLight)),
    harmonyOkRate: rate(calls.filter((c) => c.harmony).map((c) => c.harmony!.ok)),
    statusOkRate: rate(calls.filter((c) => c.status).map((c) => c.status!.ok)),
    strictSchemaRate: rate(calls.map((c) => c.strictSchemaValid)),
    rangeOverallMean: mean(shaped.map((c) => c.range!.overall)),
    meanAbsDeltaLMean: mean(engine.map((c) => c.engine!.meanAbsDeltaL)),
    infeasibleMean: mean(engine.map((c) => c.engine!.infeasibleCount)),
  };
}
