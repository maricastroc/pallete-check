import { describe, it, expect } from 'vitest';
import { mockProposal } from '@/features/llm/mock';
import type { GenerateInput } from '@/features/llm/schema';
import { SWEEP, VARIANCE } from '../golden';
import { getRawOutput, type RawOutput } from '../probe';
import {
  aggregate,
  circResultantLength,
  circStdDeg,
  evaluateCall,
  varianceStat,
} from '../metrics';

const input: GenerateInput = {
  productType: 'fintech dashboard',
  vibe: 'trustworthy',
  scheme: 'complementary',
};

function raw(rawText: string | null, over: Partial<RawOutput> = {}): RawOutput {
  return { input, source: 'mock', model: 'mock', temperature: 0, rawText, ...over };
}

describe('evaluateCall — boundary reliability (Group A)', () => {
  it('flags a transport error (no text at all)', () => {
    const m = evaluateCall(raw(null, { error: 'network down' }));
    expect(m.errored).toBe(true);
    expect(m.jsonValid).toBe(false);
    expect(m.engine).toBeNull();
  });

  it('flags invalid JSON without crashing', () => {
    const m = evaluateCall(raw('{not json'));
    expect(m.jsonValid).toBe(false);
    expect(m.shapeValid).toBe(false);
    expect(m.range).toBeNull();
  });

  it('flags a valid-JSON but wrong-shape payload (missing a token)', () => {
    const p = mockProposal(input) as unknown as Record<string, Record<string, unknown>>;
    delete p.light.primary;
    const m = evaluateCall(raw(JSON.stringify(p)));
    expect(m.jsonValid).toBe(true);
    expect(m.shapeValid).toBe(false);
    expect(m.shapeIssues.some((i) => i.includes('primary'))).toBe(true);
    expect(m.strictSchemaValid).toBe(false);
    expect(m.engine).toBeNull();
  });

  it('measures range on RAW numbers and still lets sanitize rescue the engine', () => {
    const p = mockProposal(input);
    p.light.primary = { l: 0.5, c: 0.9, h: 400 }; // c out of 0.37, h out of 360
    const m = evaluateCall(raw(JSON.stringify(p)));

    expect(m.shapeValid).toBe(true);
    // relies on the P3 zod range bounds (l 0–1, c 0–0.37, h 0–360)
    expect(m.strictSchemaValid).toBe(false);
    expect(m.range).not.toBeNull();
    expect(m.range!.c.inRange).toBe(m.range!.c.total - 1);
    expect(m.range!.h.inRange).toBe(m.range!.h.total - 1);
    expect(m.range!.maxChromaOverflow).toBeCloseTo(0.9 - 0.37, 6);
    // engine still runs: sanitize clamps, repair produces a passing palette
    expect(m.engine).not.toBeNull();
    expect(m.engine!.auditPasses).toBe(true);
  });
});

describe('evaluateCall — creative-brief adherence (Group B)', () => {
  it('rejects a status color that leaves its hue family', () => {
    const p = mockProposal(input);
    p.light.danger = { ...p.light.danger, h: 200 }; // blue, not red
    const m = evaluateCall(raw(JSON.stringify(p)));
    expect(m.status!.danger).toBe(false);
    expect(m.status!.ok).toBe(false);
    // the other three are untouched → still conventional
    expect(m.status!.success).toBe(true);
  });

  it('flags a primary hue sitting in the generic violet/indigo band', () => {
    const p = mockProposal(input);
    p.light.primary = { ...p.light.primary, h: 282 };
    const m = evaluateCall(raw(JSON.stringify(p)));
    expect(m.distinct!.avoidsGeneric).toBe(false);
    expect(m.distinct!.primaryHue).toBeCloseTo(282, 6);
  });
});

describe('the mock is a clean, deterministic baseline for the whole golden set', () => {
  it('scores 100% on every boundary + engine invariant across the sweep', async () => {
    const calls = await Promise.all(
      SWEEP.map(async (c) => evaluateCall(await getRawOutput(c, { temperature: 0, mode: 'mock' }))),
    );
    const agg = aggregate(calls);

    expect(agg.n).toBe(SWEEP.length);
    expect(agg.jsonValidRate).toBe(1);
    expect(agg.shapeValidRate).toBe(1);
    expect(agg.strictSchemaRate).toBe(1);
    expect(agg.range!.overall).toBe(1);
    expect(agg.harmonyOkRate).toBe(1);
    expect(agg.engine!.auditPassRate).toBe(1);
    expect(agg.engine!.meanInfeasible).toBe(0);
  });

  it('produces spread-out primary hues across the set (diversity signal works)', async () => {
    const calls = await Promise.all(
      SWEEP.map(async (c) => evaluateCall(await getRawOutput(c, { temperature: 0, mode: 'mock' }))),
    );
    const agg = aggregate(calls);
    expect(agg.hueDiversityIndex).toBeGreaterThan(0.3);
    expect(agg.hueBinsCovered).toBeGreaterThan(4);
  });
});

describe('variance — a deterministic source shows zero dispersion', () => {
  it('reports σ=0 and 100% stability for repeated mock calls', async () => {
    const c = VARIANCE.cases[0];
    const calls = await Promise.all(
      Array.from({ length: 5 }, async () =>
        evaluateCall(await getRawOutput(c, { temperature: 0.9, mode: 'mock' })),
      ),
    );
    const v = varianceStat(c.id, c, calls);
    expect(v.repeats).toBe(5);
    expect(v.primaryHueCircStdDeg).toBeCloseTo(0, 6);
    expect(v.primaryChromaStd).toBeCloseTo(0, 6);
    expect(v.harmonyOkRate).toBe(1);
    expect(v.strictSchemaRate).toBe(1);
  });
});

describe('circular statistics helpers', () => {
  it('resultant length is ~1 for identical hues, ~0 for evenly opposed', () => {
    expect(circResultantLength([100, 100, 100])).toBeCloseTo(1, 6);
    expect(circResultantLength([0, 90, 180, 270])).toBeCloseTo(0, 6);
    expect(circResultantLength([])).toBe(1);
  });

  it('circular std is small for a tight cluster and large for a spread', () => {
    expect(circStdDeg([10, 12, 11, 9])).toBeLessThan(5);
    expect(circStdDeg([0, 120, 240])).toBeGreaterThan(45);
  });

  it('handles the 360/0 wraparound', () => {
    // 359 and 1 are 2° apart, not 358° — resultant length stays high
    expect(circResultantLength([359, 0, 1])).toBeGreaterThan(0.99);
  });
});
