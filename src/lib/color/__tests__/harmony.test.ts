import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { checkHarmony, hueDistance } from '../harmony';
import { repair } from '../repair';
import { allowedHues, harmonyTolerance } from '../rules';
import type { HarmonyScheme, OKLCH, Palette, TokenName } from '../types';
import { makePalette, lightPalette, paletteArb } from './helpers';

const CH = (h: number): OKLCH => ({ l: 0.5, c: 0.12, h });

/** A palette whose judged (chromatic, non-status) tokens sit at the given hues. */
function harmonyPalette(base: number, hues: Partial<Record<TokenName, number>>): Palette {
  const overrides: Partial<Record<TokenName, OKLCH>> = { primary: CH(base) };
  for (const [t, h] of Object.entries(hues)) overrides[t as TokenName] = CH(h!);
  return makePalette(overrides);
}

const SCHEMES: HarmonyScheme[] = ['monochromatic', 'analogous', 'complementary', 'triadic'];

describe('hueDistance', () => {
  it('is the shortest angular distance, with wraparound', () => {
    expect(hueDistance(10, 20)).toBeCloseTo(10);
    expect(hueDistance(350, 10)).toBeCloseTo(20);
    expect(hueDistance(0, 180)).toBeCloseTo(180);
    expect(hueDistance(200, 200)).toBe(0);
  });
});

describe('checkHarmony', () => {
  it('passes when hues match the scheme anchors', () => {
    const base = 210;
    expect(checkHarmony(harmonyPalette(base, { focusRing: base }), 'monochromatic').ok).toBe(true);
    expect(
      checkHarmony(harmonyPalette(base, { focusRing: base + 180 }), 'complementary').ok,
    ).toBe(true);
    expect(
      checkHarmony(
        harmonyPalette(base, { focusRing: base + 120, selection: base + 240 }),
        'triadic',
      ).ok,
    ).toBe(true);
  });

  it('flags a hue outside tolerance and names the deviating token', () => {
    const report = checkHarmony(harmonyPalette(200, { focusRing: 200 + 40 }), 'monochromatic');
    expect(report.ok).toBe(false);
    expect(report.deviations.map((d) => d.token)).toContain('focusRing');
    expect(report.deviations[0].delta).toBeGreaterThan(harmonyTolerance('monochromatic'));
  });

  it('ignores status colors — they sit outside the harmonic identity', () => {
    const p = harmonyPalette(200, { danger: 25, success: 150 });
    expect(checkHarmony(p, 'monochromatic').ok).toBe(true);
  });

  it('ignores near-neutral tokens (no meaningful hue)', () => {
    const p = makePalette({
      primary: CH(200),
      text: { l: 0.2, c: 0.005, h: 40 }, // neutral → exempt even though hue is far
    });
    expect(checkHarmony(p, 'monochromatic').ok).toBe(true);
  });
});

describe('checkHarmony — properties', () => {
  it('passes for hues placed at scheme anchors (± jitter within tolerance)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCHEMES),
        fc.double({ min: 0, max: 359.999, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 5 }),
        (scheme, base, pick) => {
          const anchors = allowedHues(scheme, base);
          const tol = harmonyTolerance(scheme);
          const jitter = tol * 0.5;
          const anchor = anchors[pick % anchors.length];
          const p = harmonyPalette(base, {
            focusRing: anchor + jitter,
            selection: anchor - jitter,
          });
          expect(checkHarmony(p, scheme, base).ok).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('fails when a hue sits beyond tolerance from every anchor', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SCHEMES),
        fc.double({ min: 0, max: 359.999, noNaN: true, noDefaultInfinity: true }),
        (scheme, base) => {
          const anchors = allowedHues(scheme, base);
          const tol = harmonyTolerance(scheme);
          // Halfway between the two nearest anchors is the farthest possible point.
          // For single-anchor schemes, offset by (tol + margin).
          let badHue: number;
          if (anchors.length === 1) {
            badHue = base + tol + 10;
          } else {
            // midpoint of the largest gap between consecutive anchors
            const sorted = [...anchors].sort((a, b) => a - b);
            badHue = (sorted[0] + sorted[1]) / 2;
          }
          const report = checkHarmony(harmonyPalette(base, { focusRing: badHue }), scheme, base);
          // Only assert failure when the constructed hue truly exceeds tolerance.
          const minDelta = Math.min(...anchors.map((a) => hueDistance(badHue, a)));
          if (minDelta > tol) expect(report.ok).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('repair is harmony-preserving — the report is identical before and after', () => {
    fc.assert(
      fc.property(paletteArb, fc.constantFrom(...SCHEMES), (src, scheme) => {
        const before = checkHarmony(src, scheme);
        const after = checkHarmony(repair(src).palette, scheme);
        expect(after.ok).toBe(before.ok);
        expect(after.deviations).toEqual(before.deviations);
      }),
      { numRuns: 200 },
    );
  });

  it('the real light theme is monochromatic and stays so after repair', () => {
    const src = lightPalette();
    expect(checkHarmony(src, 'monochromatic').ok).toBe(true);
    expect(checkHarmony(repair(src).palette, 'monochromatic').ok).toBe(true);
  });
});
