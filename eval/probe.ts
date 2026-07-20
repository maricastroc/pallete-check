import Groq from 'groq-sdk';
import { buildUserPrompt, SYSTEM_PROMPT } from '@/features/llm/prompt';
import { mockProposal } from '@/features/llm/mock';
import type { GenerateInput } from '@/features/llm/schema';

/**
 * The harness talks to the model through the SAME prompt the product uses
 * (SYSTEM_PROMPT + buildUserPrompt) but keeps its own thin client so it can
 * capture the RAW string before JSON.parse / schema validation — the two things
 * the production client (client.ts) throws away, and exactly where model
 * reliability lives. It does not touch the cage; it re-measures the cage's seam.
 */

// Recomputed (not imported) so the harness stays a standalone apparatus; matches
// the expression in client.ts. Keep in sync if the production default changes.
export const EVAL_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

export type ProbeMode = 'mock' | 'real';

export interface RawOutput {
  input: GenerateInput;
  source: 'llm' | 'mock';
  model: string;
  temperature: number;
  /** Raw model text, exactly as returned, before any parsing. Null if the call errored. */
  rawText: string | null;
  /** Transport/API error (network, 429, empty response) — distinct from bad JSON. */
  error?: string;
}

export interface ProbeOptions {
  temperature: number;
  mode: ProbeMode;
}

function messagesFor(input: GenerateInput) {
  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserPrompt(input) },
  ];
}

/**
 * Mock mode serializes the deterministic offline proposal to a string and runs
 * it through the exact same parse/measure path — so the whole harness is
 * exercisable offline and deterministically, with no API key.
 */
function mockRaw(input: GenerateInput, temperature: number): RawOutput {
  return {
    input,
    source: 'mock',
    model: 'mock',
    temperature,
    rawText: JSON.stringify(mockProposal(input)),
  };
}

async function realRaw(
  input: GenerateInput,
  temperature: number,
): Promise<RawOutput> {
  const base: Omit<RawOutput, 'rawText' | 'error'> = {
    input,
    source: 'llm',
    model: EVAL_MODEL,
    temperature,
  };
  try {
    const groq = new Groq();
    const completion = await groq.chat.completions.create({
      model: EVAL_MODEL,
      messages: messagesFor(input),
      response_format: { type: 'json_object' },
      temperature,
      max_tokens: 4096,
    });
    const content = completion.choices[0]?.message?.content ?? null;
    if (!content) return { ...base, rawText: null, error: 'empty response' };
    return { ...base, rawText: content };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ...base, rawText: null, error };
  }
}

export function getRawOutput(
  input: GenerateInput,
  { temperature, mode }: ProbeOptions,
): Promise<RawOutput> {
  return mode === 'mock'
    ? Promise.resolve(mockRaw(input, temperature))
    : realRaw(input, temperature);
}
