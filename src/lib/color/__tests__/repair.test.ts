import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { repair } from '../repair';
import { verify } from '../verify';
import { contrast } from '../contrast';
import { rulesForToken, FOREGROUND_TOKENS } from '../rules';
import type { OKLCH, Palette, TokenName } from '../types';
import {
  lightPalette,
  makePalette,
  paletteArb,
  lightAnchoredPaletteArb,
} from './helpers';

/** Does the token at lightness `l` pass all its rules at the required minimum? */
function passesAtMin(palette: Palette, token: TokenName, l: number): boolean {
  const color: OKLCH = { ...palette[token], l };
  return rulesForToken(token).every(
    (r) => contrast(color, palette[r.bg]) >= r.min,
  );
}

/** Closest passing lightness to `proposedL`, found by brute-force scan (ground truth). */
function scanClosestPassing(
  palette: Palette,
  token: TokenName,
  proposedL: number,
): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (let l = 0; l <= 1.00001; l += 0.001) {
    const li = Math.min(l, 1);
    if (passesAtMin(palette, token, li)) {
      const d = Math.abs(li - proposedL);
      if (d < bestDist) {
        bestDist = d;
        best = li;
      }
    }
  }
  return best;
}

describe('repair — unit', () => {
  it('makes the hand-tuned light theme fully pass, with an empty infeasible set', () => {
    const { palette, infeasible } = repair(lightPalette());
    expect(infeasible).toEqual([]);
    expect(verify(palette, 'light').passes).toBe(true);
  });

  it('darkens the too-light border and the yellow warning', () => {
    const src = lightPalette();
    const { trace } = repair(src);
    const border = trace.find((t) => t.token === 'border')!;
    const warning = trace.find((t) => t.token === 'warning')!;
    expect(border.deltaL).toBeLessThan(0);
    expect(warning.deltaL).toBeLessThan(0);
    expect(border.passedBefore).toBe(false);
    expect(border.passedAfter).toBe(true);
  });

  it('leaves an already-passing token untouched (ΔL = 0)', () => {
    const src = lightPalette(); // text is 0.25 on white — already fine
    const { trace } = repair(src);
    const text = trace.find((t) => t.token === 'text')!;
    expect(text.passedBefore).toBe(true);
    expect(text.deltaL).toBe(0);
  });

  it('produces a trace entry for every foreground token', () => {
    const { trace } = repair(lightPalette());
    expect(trace.map((t) => t.token).sort()).toEqual([...FOREGROUND_TOKENS].sort());
  });

  it('when both polarities are valid, picks the one closer to the proposal', () => {
    // A focus ring (ui, 3:1) on a mid-tone surface can satisfy 3:1 either dark
    // OR light. Proposed slightly-light → repair should push it lighter, not dark.
    const p = makePalette({
      surface: { l: 0.5, c: 0, h: 0 },
      bg: { l: 0.5, c: 0, h: 0 },
      focusRing: { l: 0.62, c: 0, h: 0 }, // fails (too close to surface)
    });
    const step = repair(p).trace.find((t) => t.token === 'focusRing')!;
    expect(step.passedBefore).toBe(false);
    expect(step.passedAfter).toBe(true);
    expect(step.deltaL).toBeGreaterThan(0); // moved lighter, the nearer feasible side
  });

  it('records the binding rule and post-repair ratio', () => {
    const { trace } = repair(lightPalette());
    const warning = trace.find((t) => t.token === 'warning')!;
    expect(warning.bindingRule).not.toBeNull();
    expect(warning.repairedRatio).toBeGreaterThanOrEqual(warning.bindingRule!.min);
  });
});

describe('repair — infeasibility (honesty)', () => {
  it('reports a token that cannot be satisfied by lightness alone', () => {
    // `text` must be dark against a white surface AND light against a black
    // selection — no single lightness can do both.
    const p = makePalette({
      bg: { l: 1, c: 0, h: 0 },
      surface: { l: 1, c: 0, h: 0 },
      surfaceElevated: { l: 1, c: 0, h: 0 },
      selection: { l: 0, c: 0, h: 0 },
      text: { l: 0.5, c: 0, h: 0 },
    });
    const { infeasible, trace } = repair(p);
    expect(infeasible).toContain('text');
    expect(trace.find((t) => t.token === 'text')!.infeasible).toBe(true);
  });
});

describe('repair — properties', () => {
  it('P1: never changes hue or chroma — only lightness', () => {
    fc.assert(
      fc.property(paletteArb, (src) => {
        const { palette } = repair(src);
        for (const t of FOREGROUND_TOKENS) {
          expect(palette[t].c).toBe(src[t].c);
          expect(palette[t].h).toBe(src[t].h);
        }
      }),
      { numRuns: 250 },
    );
  });

  it('P2: repaired lightness is always in [0, 1]', () => {
    fc.assert(
      fc.property(paletteArb, (src) => {
        const { palette } = repair(src);
        for (const t of FOREGROUND_TOKENS) {
          expect(palette[t].l).toBeGreaterThanOrEqual(0);
          expect(palette[t].l).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 250 },
    );
  });

  it('P3: every feasible token passes all its rules at the required minimum', () => {
    fc.assert(
      fc.property(paletteArb, (src) => {
        const { palette, trace, infeasible } = repair(src);
        const skip = new Set(infeasible);
        for (const step of trace) {
          if (skip.has(step.token)) continue;
          expect(passesAtMin(palette, step.token, palette[step.token].l)).toBe(true);
        }
      }),
      { numRuns: 400 },
    );
  });

  it('P4: with light anchors, nothing is infeasible and the whole theme passes', () => {
    fc.assert(
      fc.property(lightAnchoredPaletteArb, (src) => {
        const { palette, infeasible } = repair(src);
        expect(infeasible).toEqual([]);
        expect(verify(palette, 'light').passes).toBe(true);
      }),
      { numRuns: 250 },
    );
  });

  it('P5: minimal change — repaired lightness is as close to proposed as the true optimum', () => {
    fc.assert(
      fc.property(lightAnchoredPaletteArb, (src) => {
        const { palette, trace } = repair(src);
        for (const step of trace) {
          const optimum = scanClosestPassing(src, step.token, step.proposedL);
          if (optimum === null) continue; // infeasible; handled elsewhere
          const repairedDist = Math.abs(palette[step.token].l - step.proposedL);
          const optimumDist = Math.abs(optimum - step.proposedL);
          // repair must not overshoot the closest passing solution.
          expect(repairedDist).toBeLessThanOrEqual(optimumDist + 0.03);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('P6: idempotent — repairing a repaired palette changes nothing', () => {
    fc.assert(
      fc.property(paletteArb, (src) => {
        const once = repair(src).palette;
        const twice = repair(once).palette;
        for (const t of FOREGROUND_TOKENS) {
          expect(twice[t].l).toBeCloseTo(once[t].l, 9);
        }
      }),
      { numRuns: 250 },
    );
  });
});
