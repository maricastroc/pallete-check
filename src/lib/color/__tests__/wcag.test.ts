import { describe, it, expect } from 'vitest';
import { thresholdFor, meetsAA, meetsAAA, meetsLevel } from '../wcag';

describe('wcag thresholds', () => {
  it('encodes the WCAG 2.1 ratios', () => {
    expect(thresholdFor('text', 'AA')).toBe(4.5);
    expect(thresholdFor('text', 'AAA')).toBe(7);
    expect(thresholdFor('largeText', 'AA')).toBe(3);
    expect(thresholdFor('largeText', 'AAA')).toBe(4.5);
    expect(thresholdFor('ui', 'AA')).toBe(3);
  });

  it('meetsAA / meetsAAA respect the boundaries', () => {
    expect(meetsAA(4.5, 'text')).toBe(true);
    expect(meetsAA(4.49, 'text')).toBe(false);
    expect(meetsAAA(7, 'text')).toBe(true);
    expect(meetsAAA(6.99, 'text')).toBe(false);
  });

  it('meetsLevel dispatches on kind + level', () => {
    expect(meetsLevel(3, 'ui', 'AA')).toBe(true);
    expect(meetsLevel(3, 'text', 'AA')).toBe(false);
    expect(meetsLevel(4.5, 'largeText', 'AAA')).toBe(true);
  });
});
