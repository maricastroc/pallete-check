import { describe, it, expect } from 'vitest';
import { materialize } from '../materialize';
import { mockProposal } from '../mock';
import { CORE_TOKENS } from '../schema';
import { ALL_TOKENS, isInGamut } from '@/lib/color';
import type { Proposal } from '../schema';

const proposal: Proposal = mockProposal({
  productType: 'fintech dashboard',
  vibe: 'premium',
  scheme: 'monochromatic',
});

describe('materialize', () => {
  it('produces all 18 tokens for both themes', () => {
    const themes = materialize(proposal);
    for (const theme of [themes.light, themes.dark]) {
      expect(Object.keys(theme).sort()).toEqual([...ALL_TOKENS].sort());
    }
  });

  it('keeps every token inside the sRGB gamut', () => {
    const themes = materialize(proposal);
    for (const theme of [themes.light, themes.dark]) {
      for (const t of ALL_TOKENS) {
        expect(isInGamut(theme[t])).toBe(true);
      }
    }
  });

  it('carries the core colors through with hue preserved', () => {
    const themes = materialize(proposal);
    for (const t of CORE_TOKENS) {
      // Hue is a pure creative decision — never altered by materialization.
      expect(themes.light[t].h).toBeCloseTo(proposal.light[t].h, 6);
    }
  });

  it('derives interaction states darker in light, lighter in dark', () => {
    const themes = materialize(proposal);
    expect(themes.light.primaryHover.l).toBeLessThan(themes.light.primary.l);
    expect(themes.light.primaryActive.l).toBeLessThan(themes.light.primaryHover.l);
    expect(themes.dark.primaryHover.l).toBeGreaterThan(themes.dark.primary.l);
    expect(themes.dark.primaryActive.l).toBeGreaterThan(themes.dark.primaryHover.l);
  });

  it('derives borders between surface and text lightness', () => {
    const { light } = materialize(proposal);
    const lo = Math.min(light.surface.l, light.text.l);
    const hi = Math.max(light.surface.l, light.text.l);
    expect(light.border.l).toBeGreaterThanOrEqual(lo);
    expect(light.border.l).toBeLessThanOrEqual(hi);
    // borderStrong steps further from the surface than border.
    expect(Math.abs(light.borderStrong.l - light.surface.l)).toBeGreaterThan(
      Math.abs(light.border.l - light.surface.l),
    );
  });

  it('clamps out-of-range proposals instead of throwing', () => {
    const wild = mockProposal({ productType: 'x', vibe: '', scheme: 'triadic' });
    // Corrupt one color with impossible values.
    wild.light.primary = { l: 5, c: 2, h: 720 };
    const themes = materialize(wild);
    expect(themes.light.primary.l).toBeLessThanOrEqual(1);
    expect(themes.light.primary.h).toBeGreaterThanOrEqual(0);
    expect(themes.light.primary.h).toBeLessThan(360);
    expect(isInGamut(themes.light.primary)).toBe(true);
  });
});
