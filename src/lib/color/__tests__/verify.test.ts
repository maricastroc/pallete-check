import { describe, it, expect } from 'vitest';
import { verify, checkRule } from '../verify';
import { RULES } from '../rules';
import { makePalette, lightPalette } from './helpers';

describe('checkRule', () => {
  it('reports pass/fail against the required level', () => {
    // Black text on white surface → 21:1, passes everything.
    const p = makePalette({
      text: { l: 0, c: 0, h: 0 },
      bg: { l: 1, c: 0, h: 0 },
      surface: { l: 1, c: 0, h: 0 },
      surfaceElevated: { l: 1, c: 0, h: 0 },
      selection: { l: 1, c: 0, h: 0 },
    });
    const res = checkRule(p, RULES.find((r) => r.fg === 'text' && r.bg === 'bg')!);
    expect(res.ratio).toBeCloseTo(21, 4);
    expect(res.passAA).toBe(true);
    expect(res.passAAA).toBe(true);
    expect(res.passRequired).toBe(true);
  });

  it('detects a failing pair', () => {
    // Mid-gray text on white → well under 4.5.
    const p = makePalette({
      text: { l: 0.75, c: 0, h: 0 },
      bg: { l: 1, c: 0, h: 0 },
    });
    const res = checkRule(p, RULES.find((r) => r.fg === 'text' && r.bg === 'bg')!);
    expect(res.passRequired).toBe(false);
  });
});

describe('verify', () => {
  it('an all-neutral gray palette fails many rules', () => {
    const gray = makePalette({}); // every token l:0.5, c:0
    const report = verify(gray, 'light');
    expect(report.passes).toBe(false);
    expect(report.results.some((r) => !r.passRequired)).toBe(true);
    expect(report.results.length).toBe(RULES.length);
  });

  it('the hand-tuned light theme still has weak spots pre-repair', () => {
    // The fixture deliberately includes a too-light border and a yellow warning.
    const report = verify(lightPalette(), 'light');
    const failing = report.results.filter((r) => !r.passRequired).map((r) => r.rule.fg);
    expect(failing).toContain('border');
    expect(failing).toContain('warning');
  });

  it('carries the theme label through', () => {
    expect(verify(lightPalette(), 'dark').theme).toBe('dark');
  });
});
