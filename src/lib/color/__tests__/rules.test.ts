import { describe, it, expect } from 'vitest';
import {
  RULES,
  ALL_TOKENS,
  ANCHOR_TOKENS,
  FOREGROUND_TOKENS,
  rulesForToken,
  rulesAreDisjoint,
  allowedHues,
  harmonyTolerance,
} from '../rules';
import { thresholdFor } from '../wcag';
import type { TokenName } from '../types';

describe('rule table integrity', () => {
  it('every rule.min equals its derived WCAG threshold', () => {
    for (const r of RULES) {
      expect(r.min).toBe(thresholdFor(r.kind, r.level));
    }
  });

  it('foreground and background token sets are disjoint (independent repair is valid)', () => {
    expect(rulesAreDisjoint()).toBe(true);
  });

  it('ANCHOR_TOKENS never appear as a foreground', () => {
    const fg = new Set(FOREGROUND_TOKENS);
    for (const a of ANCHOR_TOKENS) expect(fg.has(a)).toBe(false);
  });

  it('anchors ∪ foregrounds covers exactly ALL_TOKENS', () => {
    const union = new Set<TokenName>([...ANCHOR_TOKENS, ...FOREGROUND_TOKENS]);
    expect(union.size).toBe(ALL_TOKENS.length);
    for (const t of ALL_TOKENS) expect(union.has(t)).toBe(true);
  });

  it('every rule references known tokens', () => {
    const known = new Set(ALL_TOKENS);
    for (const r of RULES) {
      expect(known.has(r.fg)).toBe(true);
      expect(known.has(r.bg)).toBe(true);
    }
  });

  it('rulesForToken returns only rules with that foreground', () => {
    for (const r of rulesForToken('text')) expect(r.fg).toBe('text');
    expect(rulesForToken('text').length).toBeGreaterThan(1); // multi-constraint
  });
});

describe('harmony specs', () => {
  it('allowedHues places anchors at the right offsets', () => {
    expect(allowedHues('monochromatic', 200)).toEqual([200]);
    expect(allowedHues('complementary', 200)).toEqual([200, 20]);
    expect(allowedHues('triadic', 30)).toEqual([30, 150, 270]);
  });

  it('wraps hues into [0, 360)', () => {
    expect(allowedHues('complementary', 300)).toEqual([300, 120]);
  });

  it('exposes a positive tolerance per scheme', () => {
    for (const s of ['analogous', 'complementary', 'triadic', 'monochromatic'] as const) {
      expect(harmonyTolerance(s)).toBeGreaterThan(0);
    }
  });
});
