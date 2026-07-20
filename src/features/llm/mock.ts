import type { GenerateInput, Proposal } from './schema';

function hashHue(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (((h >>> 0) % 360) + 360) % 360;
}

export function mockProposal(input: GenerateInput): Proposal {
  const H = hashHue(`${input.productType}|${input.vibe}|${input.scheme}`);

  return {
    name: 'Mock Signal',
    rationale: `An offline placeholder palette for "${input.productType}". Set GROQ_API_KEY to generate a real one.`,
    scheme: input.scheme,
    light: {
      bg: { l: 0.98, c: 0.005, h: H },
      surface: { l: 1.0, c: 0.0, h: H },
      surfaceElevated: { l: 0.99, c: 0.006, h: H },
      text: { l: 0.28, c: 0.02, h: H },
      textSecondary: { l: 0.55, c: 0.02, h: H },
      primary: { l: 0.45, c: 0.15, h: H },
      onPrimary: { l: 0.98, c: 0.01, h: H },
      danger: { l: 0.55, c: 0.19, h: 25 },
      warning: { l: 0.82, c: 0.17, h: 90 },
      success: { l: 0.62, c: 0.15, h: 150 },
      info: { l: 0.6, c: 0.14, h: 250 },
      focusRing: { l: 0.55, c: 0.18, h: H },
      selection: { l: 0.9, c: 0.06, h: H },
    },
    dark: {
      bg: { l: 0.16, c: 0.01, h: H },
      surface: { l: 0.2, c: 0.012, h: H },
      surfaceElevated: { l: 0.24, c: 0.014, h: H },
      text: { l: 0.95, c: 0.01, h: H },
      textSecondary: { l: 0.68, c: 0.02, h: H },
      primary: { l: 0.72, c: 0.15, h: H },
      onPrimary: { l: 0.18, c: 0.02, h: H },
      danger: { l: 0.7, c: 0.17, h: 25 },
      warning: { l: 0.82, c: 0.16, h: 90 },
      success: { l: 0.75, c: 0.14, h: 150 },
      info: { l: 0.75, c: 0.14, h: 250 },
      focusRing: { l: 0.7, c: 0.18, h: H },
      selection: { l: 0.32, c: 0.06, h: H },
    },
  };
}
