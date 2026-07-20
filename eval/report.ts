import type { HarmonyScheme } from '@/lib/color';
import type { GenerateInput } from '@/features/llm/schema';
import { HARMONY_SCHEMES } from '@/features/llm/schema';
import {
  aggregate,
  type Aggregate,
  type CallMetrics,
  type VarianceStat,
} from './metrics';

export const HARNESS_VERSION = '1.0.0';

export interface CaseRow {
  id: string;
  input: GenerateInput;
  jsonValid: boolean;
  shapeValid: boolean;
  strictSchemaValid: boolean;
  rangeOverall: number | null;
  harmonyOk: boolean | null;
  statusOk: boolean | null;
  avoidsGeneric: boolean | null;
  meanAbsDeltaL: number | null;
  infeasibleCount: number | null;
  error?: string;
}

export interface EvalReport {
  harnessVersion: string;
  goldenSetVersion: string;
  model: string;
  mode: 'mock' | 'real';
  temperature: number;
  timestamp: string;
  totals: Aggregate;
  perScheme: Partial<Record<HarmonyScheme, Aggregate>>;
  cases: CaseRow[];
  variance: VarianceStat[];
}

function toRow(id: string, m: CallMetrics): CaseRow {
  return {
    id,
    input: m.input,
    jsonValid: m.jsonValid,
    shapeValid: m.shapeValid,
    strictSchemaValid: m.strictSchemaValid,
    rangeOverall: m.range?.overall ?? null,
    harmonyOk: m.harmony?.ok ?? null,
    statusOk: m.status?.ok ?? null,
    avoidsGeneric: m.distinct?.avoidsGeneric ?? null,
    meanAbsDeltaL: m.engine?.meanAbsDeltaL ?? null,
    infeasibleCount: m.engine?.infeasibleCount ?? null,
  };
}

export function buildReport(params: {
  goldenSetVersion: string;
  model: string;
  mode: 'mock' | 'real';
  temperature: number;
  timestamp: string;
  sweep: Array<{ id: string; metrics: CallMetrics }>;
  variance: VarianceStat[];
}): EvalReport {
  const calls = params.sweep.map((s) => s.metrics);

  const perScheme: Partial<Record<HarmonyScheme, Aggregate>> = {};
  for (const scheme of HARMONY_SCHEMES) {
    const forScheme = calls.filter((c) => c.input.scheme === scheme);
    if (forScheme.length) perScheme[scheme] = aggregate(forScheme);
  }

  return {
    harnessVersion: HARNESS_VERSION,
    goldenSetVersion: params.goldenSetVersion,
    model: params.model,
    mode: params.mode,
    temperature: params.temperature,
    timestamp: params.timestamp,
    totals: aggregate(calls),
    perScheme,
    cases: params.sweep.map((s) => toRow(s.id, s.metrics)),
    variance: params.variance,
  };
}

// ── Terminal rendering (no dependencies) ────────────────────────────────────

const pct = (x: number | null, dp = 0): string =>
  x === null ? '  — ' : `${(x * 100).toFixed(dp)}%`;
const mark = (b: boolean | null): string => (b === null ? '—' : b ? '✓' : '✗');
const num = (x: number | null, dp = 3): string => (x === null ? '—' : x.toFixed(dp));
const deg = (x: number): string => `${x.toFixed(1)}°`;

function padR(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padL(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function renderScorecard(a: Aggregate): string[] {
  const lines: string[] = [];
  const row = (label: string, value: string, note = ''): void => {
    lines.push(`     ${padR(label, 24)} ${padL(value, 6)}   ${note}`);
  };

  lines.push('  A. Boundary reliability  (what the engine can never fix)');
  row('JSON valid', pct(a.jsonValidRate));
  row('Shape valid', pct(a.shapeValidRate));
  row('Strict schema (gate)', pct(a.strictSchemaRate));
  if (a.range) {
    row(
      'Range in-bounds',
      pct(a.range.overall),
      `l ${pct(a.range.l)} · c ${pct(a.range.c)} · h ${pct(a.range.h)} · overflow ${num(a.range.meanChromaOverflow)}`,
    );
  }

  lines.push('  B. Creative-brief adherence  (hue identity the engine never touches)');
  row('Harmony scheme ok', pct(a.harmonyOkRate), `mean worst Δ ${deg(a.meanHarmonyMaxDelta)}`);
  row(
    'Status conventions',
    pct(a.statusOkRate),
    `danger ${pct(a.perStatus.danger)} · warn ${pct(a.perStatus.warning)} · ok ${pct(a.perStatus.success)} · info ${pct(a.perStatus.info)}`,
  );
  row('Avoids generic purple', pct(a.avoidsGenericRate));
  row(
    'Hue diversity index',
    a.hueDiversityIndex.toFixed(2),
    `${a.hueBinsCovered}/12 hue bins across the set`,
  );

  lines.push('  C. Engine coupling  (how good a seed the model handed the solver)');
  if (a.engine) {
    row('Repair load (mean ΔL)', num(a.engine.meanAbsDeltaL), `max ΔL ${num(a.engine.maxAbsDeltaL)}`);
    row(
      'Infeasible (any token)',
      pct(a.engine.infeasibleAnyRate),
      `mean ${num(a.engine.meanInfeasible, 2)} tokens · audit pass ${pct(a.engine.auditPassRate)}`,
    );
  }
  return lines;
}

function renderCases(cases: CaseRow[]): string[] {
  const header =
    '  ' +
    padR('ID', 9) +
    padR('SCHEME', 14) +
    padR('JSON', 5) +
    padR('SHAPE', 6) +
    padR('STRICT', 7) +
    padR('RANGE', 6) +
    padR('HARM', 5) +
    padR('STAT', 5) +
    padR('GEN', 4) +
    padR('meanΔL', 8) +
    'INF';
  const lines = [header, '  ' + '─'.repeat(header.length - 2)];
  for (const c of cases) {
    lines.push(
      '  ' +
        padR(c.id, 9) +
        padR(c.input.scheme, 14) +
        padR(mark(c.jsonValid), 5) +
        padR(mark(c.shapeValid), 6) +
        padR(mark(c.strictSchemaValid), 7) +
        padR(pct(c.rangeOverall), 6) +
        padR(mark(c.harmonyOk), 5) +
        padR(mark(c.statusOk), 5) +
        padR(mark(c.avoidsGeneric), 4) +
        padR(num(c.meanAbsDeltaL), 8) +
        (c.infeasibleCount === null ? '—' : String(c.infeasibleCount)),
    );
  }
  return lines;
}

function renderVariance(variance: VarianceStat[]): string[] {
  if (!variance.length) return [];
  const lines = [`  VARIANCE  (same prompt repeated)`];
  for (const v of variance) {
    const label = `${v.input.productType} / ${v.input.vibe} / ${v.input.scheme}`;
    lines.push(`  ${padR(v.id, 7)} ${label}  (N=${v.repeats})`);
    lines.push(
      '          ' +
        `hueσ ${deg(v.primaryHueCircStdDeg)}  cσ ${num(v.primaryChromaStd)}  lσ ${num(v.primaryLightStd)}  ` +
        `harmony ${pct(v.harmonyOkRate)}  status ${pct(v.statusOkRate)}  strict ${pct(v.strictSchemaRate)}  ` +
        `ΔL ${num(v.meanAbsDeltaLMean)}  infeas ${num(v.infeasibleMean, 2)}`,
    );
  }
  return lines;
}

export function renderTerminal(report: EvalReport): string {
  const t = report.totals;
  const out: string[] = [
    '',
    '━'.repeat(78),
    `  PALETTE-CHECK · LLM EVAL`,
    `  model ${report.model}  ·  mode ${report.mode}  ·  temperature ${report.temperature}`,
    `  harness v${report.harnessVersion}  ·  golden set v${report.goldenSetVersion}  ·  n=${t.n}  ·  ${report.timestamp}`,
    '━'.repeat(78),
    '',
    ...(t.errorRate > 0 ? [`  ⚠ transport errors on ${pct(t.errorRate)} of calls`, ''] : []),
    ...renderScorecard(t),
    '',
    ...renderCases(report.cases),
    '',
    ...renderVariance(report.variance),
    '',
    '━'.repeat(78),
  ];
  return out.join('\n');
}
