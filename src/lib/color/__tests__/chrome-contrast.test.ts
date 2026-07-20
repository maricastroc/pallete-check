import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio } from '../contrast';
import type { SRGB } from '../types';

/**
 * Contrast audit for the app's OWN chrome — not the palettes it generates.
 * The generate/verify engine only ever sees user palettes; these tokens
 * (mirrored from globals.css) were picked by hand, so we pin them here to
 * catch regressions. Keep in sync with `@theme` in src/app/globals.css.
 */
function hex(h: string): SRGB {
  const n = h.replace('#', '');
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  };
}

const ratio = (fg: string, bg: string) =>
  contrastRatio(relativeLuminance(hex(fg)), relativeLuminance(hex(bg)));

const CANVAS = '#f7f6f3';
const PANEL = '#fdfcfa';
const WHITE = '#ffffff';
const INK = '#17171a';
const INK_2 = '#55555e';
const INK_3 = '#5f5f67';
const ZINC_950 = '#09090b';
const ZINC_300 = '#d4d4d8';
const ZINC_400 = '#a1a1aa';

const AA_NORMAL = 4.5;

const LIGHT_PAIRS: [string, string, string][] = [
  ['ink on canvas', INK, CANVAS],
  ['ink on panel', INK, PANEL],
  ['ink-2 on canvas', INK_2, CANVAS],
  ['ink-2 on panel', INK_2, PANEL],
  ['ink-3 label on canvas', INK_3, CANVAS],
  ['ink-3 label on panel', INK_3, PANEL],
  ['ink-3 placeholder on white input', INK_3, WHITE],
];

const DARK_PAIRS: [string, string, string][] = [
  ['code body (zinc-300) on editor', ZINC_300, ZINC_950],
  ['line numbers (zinc-400) on editor', ZINC_400, ZINC_950],
];

describe('chrome contrast — all UI text meets WCAG AA (4.5:1)', () => {
  it.each([...LIGHT_PAIRS, ...DARK_PAIRS])('%s', (_label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('the weakest link (ink-3 on canvas) keeps a safety margin over the 4.5 floor', () => {
    expect(ratio(INK_3, CANVAS)).toBeGreaterThanOrEqual(5.5);
  });
});
