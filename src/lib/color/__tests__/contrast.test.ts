import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  contrast,
  contrastRatio,
  relativeLuminance,
  luminance,
  luminanceAtL,
} from '../contrast';
import { oklchArb } from './helpers';

const BLACK = { l: 0, c: 0, h: 0 };
const WHITE = { l: 1, c: 0, h: 0 };

describe('relativeLuminance', () => {
  it('matches WCAG reference values', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 6);
    expect(relativeLuminance({ r: 1, g: 1, b: 1 })).toBeCloseTo(1, 6);
    // sRGB green is the dominant luminance channel.
    expect(relativeLuminance({ r: 0, g: 1, b: 0 })).toBeCloseTo(0.7152, 4);
  });
});

describe('contrast', () => {
  it('black vs white is exactly 21', () => {
    expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 5);
  });

  it('a color against itself is 1', () => {
    fc.assert(
      fc.property(oklchArb, (c) => {
        expect(contrast(c, c)).toBeCloseTo(1, 6);
      }),
      { numRuns: 100 },
    );
  });

  it('is symmetric', () => {
    fc.assert(
      fc.property(oklchArb, oklchArb, (a, b) => {
        expect(contrast(a, b)).toBeCloseTo(contrast(b, a), 9);
      }),
      { numRuns: 200 },
    );
  });

  it('stays within [1, 21]', () => {
    fc.assert(
      fc.property(oklchArb, oklchArb, (a, b) => {
        const r = contrast(a, b);
        expect(r).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(r).toBeLessThanOrEqual(21 + 1e-9);
      }),
      { numRuns: 300 },
    );
  });

  it('contrastRatio is order-independent', () => {
    expect(contrastRatio(0.1, 0.8)).toBeCloseTo(contrastRatio(0.8, 0.1), 12);
  });
});

describe('luminanceAtL — the function repair inverts', () => {
  it('is monotonically non-decreasing in l (validates the binary search)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.3, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 359.999, noNaN: true, noDefaultInfinity: true }),
        (c, h) => {
          let prev = -Infinity;
          for (let l = 0; l <= 1.0001; l += 0.02) {
            const lum = luminanceAtL(c, h, Math.min(l, 1));
            expect(lum).toBeGreaterThanOrEqual(prev - 1e-9);
            prev = lum;
          }
        },
      ),
      { numRuns: 150 },
    );
  });

  it('agrees with luminance() at the endpoints', () => {
    expect(luminanceAtL(0, 0, 1)).toBeCloseTo(luminance(WHITE), 6);
    expect(luminanceAtL(0, 0, 0)).toBeCloseTo(luminance(BLACK), 6);
  });
});
