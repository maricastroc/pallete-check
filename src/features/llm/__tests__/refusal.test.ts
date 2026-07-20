import { describe, it, expect } from 'vitest';
import { isPlausibleProductType, GenerateInputSchema, type GenerateInput } from '../schema';
import { parseModelOutput } from '../client';
import { mockProposal } from '../mock';

describe('isPlausibleProductType — the cheap deterministic guard', () => {
  it('accepts real products, including short real names', () => {
    for (const s of ['a calm meditation app', 'Vim', 'n8n', 'Arc', 'Zed', 'fintech dashboard']) {
      expect(isPlausibleProductType(s)).toBe(true);
    }
  });

  it('rejects the trivial non-products', () => {
    for (const s of ['', '   ', 'a', ' x ', '1', '42', '!!!', 'aaaa', '....']) {
      expect(isPlausibleProductType(s)).toBe(false);
    }
  });

  it('does NOT try to catch semantic gibberish — that is the model’s job', () => {
    // letters, length, and >1 distinct char → passes the cheap guard by design;
    // "dssadsadsa" is exactly the case only the LLM-judge can refuse.
    expect(isPlausibleProductType('dssadsadsa')).toBe(true);
  });
});

describe('GenerateInputSchema wires the guard at the boundary', () => {
  it('rejects a trivial productType', () => {
    expect(GenerateInputSchema.safeParse({ productType: 'a', scheme: 'analogous' }).success).toBe(
      false,
    );
    expect(GenerateInputSchema.safeParse({ productType: '!!!', scheme: 'analogous' }).success).toBe(
      false,
    );
  });

  it('accepts a real productType', () => {
    expect(
      GenerateInputSchema.safeParse({ productType: 'meditation app', scheme: 'analogous' }).success,
    ).toBe(true);
  });
});

describe('parseModelOutput — proposal vs. refusal', () => {
  const input: GenerateInput = { productType: 'meditation app', vibe: '', scheme: 'analogous' };

  it('reads a full palette as a proposal', () => {
    const out = parseModelOutput(JSON.stringify(mockProposal(input)));
    expect(out.kind).toBe('proposal');
  });

  it('reads a refusal object as a refusal', () => {
    const out = parseModelOutput(JSON.stringify({ usable: false, reason: 'no product here' }));
    expect(out).toEqual({ kind: 'refusal', reason: 'no product here' });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseModelOutput('{nope')).toThrow();
  });

  it('throws on valid JSON with the wrong shape', () => {
    expect(() => parseModelOutput(JSON.stringify({ usable: true }))).toThrow();
    expect(() => parseModelOutput(JSON.stringify({ foo: 1 }))).toThrow();
  });
});
