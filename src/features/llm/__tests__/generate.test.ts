import { describe, it, expect } from 'vitest';
import { assembleResult } from '../generate';
import { mockProposal } from '../mock';
import { HARMONY_SCHEMES, type GenerateInput } from '../schema';
import { ALL_TOKENS } from '@/lib/color';

function run(input: GenerateInput) {
  return assembleResult(mockProposal(input), 'mock');
}

const baseInput: GenerateInput = {
  productType: 'meditation app',
  vibe: 'calm',
  scheme: 'analogous',
};

describe('assembleResult (the pipeline)', () => {
  it('repairs both themes to fully pass their audits', () => {
    const r = run(baseInput);
    expect(r.audit.light.passes).toBe(true);
    expect(r.audit.dark.passes).toBe(true);
  });

  it('shows the proposal failing before repair (so the trace has a story)', () => {
    const r = run(baseInput);
    // The mock intentionally includes inaccessible colors.
    expect(r.auditBefore.light.passes).toBe(false);
  });

  it('leaves nothing infeasible for the mock palettes', () => {
    const r = run(baseInput);
    expect(r.infeasible.light).toEqual([]);
    expect(r.infeasible.dark).toEqual([]);
  });

  it('records a repair trace with real, non-empty repairs', () => {
    const r = run(baseInput);
    const changed = r.trace.light.filter((s) => Math.abs(s.deltaL) > 1e-6);
    expect(changed.length).toBeGreaterThan(0);
    // warning (a too-light yellow) is a classic repair.
    const warning = r.trace.light.find((s) => s.token === 'warning')!;
    expect(warning.passedBefore).toBe(false);
    expect(warning.passedAfter).toBe(true);
  });

  it('reports harmony (repair never breaks it)', () => {
    const r = run(baseInput);
    expect(r.harmony.light.scheme).toBe('analogous');
    // Brand tokens share a hue in the mock, so any scheme is satisfied.
    expect(r.harmony.light.ok).toBe(true);
  });

  it('passes through name, rationale, scheme and source', () => {
    const r = run(baseInput);
    expect(r.name).toBeTruthy();
    expect(r.rationale).toBeTruthy();
    expect(r.scheme).toBe('analogous');
    expect(r.source).toBe('mock');
  });

  it('includes a description for every token', () => {
    const r = run(baseInput);
    for (const t of ALL_TOKENS) {
      expect(r.descriptions[t]).toBeTruthy();
    }
  });

  it('passes for every harmony scheme', () => {
    for (const scheme of HARMONY_SCHEMES) {
      const r = run({ ...baseInput, scheme });
      expect(r.audit.light.passes).toBe(true);
      expect(r.audit.dark.passes).toBe(true);
    }
  });
});
