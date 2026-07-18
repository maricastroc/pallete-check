import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  oklchToSrgb,
  oklchToSrgbRaw,
  srgbToOklch,
  oklchToHex,
  hexToOklch,
  isInGamut,
  clampChromaToGamut,
} from '../oklch';
import { oklchArb } from './helpers';

describe('oklch ↔ srgb', () => {
  it('maps white and black to the expected sRGB extremes', () => {
    const white = oklchToSrgb({ l: 1, c: 0, h: 0 });
    expect(white.r).toBeCloseTo(1, 2);
    expect(white.g).toBeCloseTo(1, 2);
    expect(white.b).toBeCloseTo(1, 2);

    const black = oklchToSrgb({ l: 0, c: 0, h: 0 });
    expect(black.r).toBeCloseTo(0, 4);
    expect(black.g).toBeCloseTo(0, 4);
    expect(black.b).toBeCloseTo(0, 4);
  });

  it('round-trips known sRGB primaries through OKLCH', () => {
    for (const rgb of [
      { r: 1, g: 0, b: 0 },
      { r: 0, g: 1, b: 0 },
      { r: 0, g: 0, b: 1 },
      { r: 0.2, g: 0.5, b: 0.9 },
    ]) {
      const back = oklchToSrgb(srgbToOklch(rgb));
      expect(back.r).toBeCloseTo(rgb.r, 3);
      expect(back.g).toBeCloseTo(rgb.g, 3);
      expect(back.b).toBeCloseTo(rgb.b, 3);
    }
  });

  it('round-trips any in-gamut OKLCH color (property)', () => {
    fc.assert(
      fc.property(oklchArb, (color) => {
        const back = srgbToOklch(oklchToSrgb(color));
        // Lightness round-trips within 0.02 across the whole gamut (tighter in the
        // interior; the loosest points are gamut-clipped extremes near black/white).
        expect(Math.abs(back.l - color.l)).toBeLessThanOrEqual(0.02);
        if (color.c > 0.02 && color.l > 0.05 && color.l < 0.95) {
          expect(back.c).toBeCloseTo(color.c, 2);
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('hex', () => {
  it('produces 6-digit lowercase hex', () => {
    expect(oklchToHex({ l: 0, c: 0, h: 0 })).toBe('#000000');
    expect(oklchToHex({ l: 1, c: 0, h: 0 })).toBe('#ffffff');
  });

  it('parses #rgb and #rrggbb, and round-trips', () => {
    expect(oklchToHex(hexToOklch('#fff'))).toBe('#ffffff');
    expect(oklchToHex(hexToOklch('#3b82f6'))).toBe('#3b82f6');
  });

  it('throws on malformed hex', () => {
    expect(() => hexToOklch('nope')).toThrow();
    expect(() => hexToOklch('#12')).toThrow();
  });
});

describe('gamut', () => {
  it('flags a wildly out-of-gamut color', () => {
    expect(isInGamut({ l: 0.5, c: 0.5, h: 30 })).toBe(false);
  });

  it('clampChromaToGamut brings colors into gamut, preserving l and h', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.05, max: 0.95, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 359.999, noNaN: true, noDefaultInfinity: true }),
        (l, h) => {
          const clamped = clampChromaToGamut({ l, c: 0.6, h });
          expect(clamped.l).toBe(l);
          expect(clamped.h).toBe(h);
          expect(clamped.c).toBeLessThanOrEqual(0.6);
          expect(isInGamut(clamped)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('leaves already-in-gamut colors untouched', () => {
    const c = { l: 0.5, c: 0.05, h: 200 };
    expect(clampChromaToGamut(c)).toEqual(c);
  });

  it('oklchToSrgbRaw can exceed [0,1] out of gamut; oklchToSrgb clips', () => {
    const raw = oklchToSrgbRaw({ l: 0.6, c: 0.4, h: 150 });
    const clipped = oklchToSrgb({ l: 0.6, c: 0.4, h: 150 });
    const anyOut = [raw.r, raw.g, raw.b].some((v) => v < 0 || v > 1);
    expect(anyOut).toBe(true);
    for (const v of [clipped.r, clipped.g, clipped.b]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
