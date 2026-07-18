import { describe, it, expect } from 'vitest';
import {
  toCssVariables,
  toJson,
  toTokensObject,
  toTailwindConfig,
  toDesignTokens,
  exportAs,
} from '../export';
import { oklchToHex } from '../oklch';
import { repair } from '../repair';
import type { ThemeSet } from '../types';
import { lightPalette, darkPalette } from './helpers';

const theme: ThemeSet = {
  light: repair(lightPalette()).palette,
  dark: repair(darkPalette()).palette,
};

describe('toCssVariables', () => {
  it('emits light under :root and dark under [data-theme="dark"]', () => {
    const css = toCssVariables(theme);
    expect(css).toContain(':root {');
    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  it('kebab-cases compound token names', () => {
    expect(toCssVariables(theme)).toContain('--color-surface-elevated:');
  });

  it('uses the exact hex of each token', () => {
    const css = toCssVariables(theme);
    expect(css).toContain(`--color-primary: ${oklchToHex(theme.light.primary)};`);
  });
});

describe('toJson / toTokensObject', () => {
  it('carries hex + oklch for both themes', () => {
    const obj = toTokensObject(theme);
    expect(obj.light.primary.hex).toBe(oklchToHex(theme.light.primary));
    expect(obj.light.primary.oklch).toMatch(/^oklch\(/);
    expect(obj.dark.surface.hex).toBe(oklchToHex(theme.dark.surface));
  });

  it('toJson is valid, parseable JSON', () => {
    const parsed = JSON.parse(toJson(theme));
    expect(Object.keys(parsed)).toEqual(['light', 'dark']);
    expect(parsed.light.text.hex).toBe(oklchToHex(theme.light.text));
  });
});

describe('toTailwindConfig', () => {
  it('maps tokens to CSS variable references', () => {
    const tw = toTailwindConfig(theme);
    expect(tw).toContain("'surface-elevated': 'var(--color-surface-elevated)',");
    expect(tw).toContain('module.exports');
  });
});

describe('toDesignTokens', () => {
  it('emits DTCG $type/$value entries per theme', () => {
    const dt = JSON.parse(toDesignTokens(theme));
    expect(dt.light.color.primary.$type).toBe('color');
    expect(dt.light.color.primary.$value).toBe(oklchToHex(theme.light.primary));
    expect(dt.dark.color.bg.$value).toBe(oklchToHex(theme.dark.bg));
  });
});

describe('exportAs', () => {
  it('dispatches to each format', () => {
    expect(exportAs(theme, 'css')).toBe(toCssVariables(theme));
    expect(exportAs(theme, 'json')).toBe(toJson(theme));
    expect(exportAs(theme, 'tailwind')).toBe(toTailwindConfig(theme));
    expect(exportAs(theme, 'design-tokens')).toBe(toDesignTokens(theme));
  });
});
