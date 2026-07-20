import Groq from 'groq-sdk';
import { assembleResult } from './generate';
import { mockProposal } from './mock';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { ProposalSchema, RefusalSchema, type GenerateInput, type Proposal } from './schema';
import type { GenerateResult } from './types';

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

const TEMPERATURE = ((): number | undefined => {
  const t = Number(process.env.GROQ_TEMPERATURE);
  return process.env.GROQ_TEMPERATURE !== undefined && Number.isFinite(t) ? t : undefined;
})();

const MAX_ATTEMPTS = 2;

class InvalidModelOutput extends Error {
  constructor(readonly kind: 'json' | 'shape' | 'empty') {
    super(`invalid model output: ${kind}`);
  }
  friendly(): Error {
    switch (this.kind) {
      case 'json':
        return new Error('Groq did not return valid JSON. Try again, or set a different GROQ_MODEL.');
      case 'shape':
        return new Error('Groq returned an unexpected palette shape. Try again, or set a different GROQ_MODEL.');
      case 'empty':
        return new Error('Groq returned an empty response. Try again.');
    }
  }
}

/**
 * A deliberate, valid model response: the product wasn't something it could
 * design for. Not a bad draw to retry — it propagates straight to the API as a 422.
 */
export class UnusableInputError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

function statusOf(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

function friendlyError(err: unknown): Error {
  const status = statusOf(err);
  if (status === 401 || status === 403) {
    return new Error(
      'Your GROQ_API_KEY is invalid or lacks access. Fix it in .env.local, or remove it to use the offline sample palette.',
    );
  }
  if (status === 404) {
    return new Error(`Groq model "${MODEL}" was not found. Set GROQ_MODEL to a valid model id.`);
  }
  if (status === 429 || status === 413) {
    return new Error('Rate limit reached on your Groq plan — wait a moment and try again, or pick a preset below.');
  }
  if (status !== undefined && status >= 500) {
    return new Error('Groq is temporarily unavailable. Please try again.');
  }
  return err instanceof Error ? err : new Error('Generation failed.');
}

async function requestCompletion(groq: Groq, input: GenerateInput): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
    response_format: { type: 'json_object' },
    ...(TEMPERATURE !== undefined ? { temperature: TEMPERATURE } : {}),
    max_tokens: 4096,
  });
  const content = completion.choices[0]?.message?.content ?? null;
  if (!content) throw new InvalidModelOutput('empty');
  return content;
}

export type ModelOutput =
  | { kind: 'proposal'; proposal: Proposal }
  | { kind: 'refusal'; reason: string };

export function parseModelOutput(content: string): ModelOutput {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new InvalidModelOutput('json');
  }
  const refusal = RefusalSchema.safeParse(raw);
  if (refusal.success) return { kind: 'refusal', reason: refusal.data.reason };
  const parsed = ProposalSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidModelOutput('shape');
  return { kind: 'proposal', proposal: parsed.data };
}

async function getProposal(
  input: GenerateInput,
): Promise<{ proposal: Proposal; source: 'llm' | 'mock' }> {
  if (!process.env.GROQ_API_KEY) {
    return { proposal: mockProposal(input), source: 'mock' };
  }

  const groq = new Groq();
  let lastInvalid: InvalidModelOutput | undefined;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let content: string;
    try {
      content = await requestCompletion(groq, input);
    } catch (err) {
      //
      if (err instanceof InvalidModelOutput) {
        lastInvalid = err;
        continue;
      }
      throw friendlyError(err);
    }

    try {
      const output = parseModelOutput(content);
      if (output.kind === 'refusal') throw new UnusableInputError(output.reason);
      return { proposal: output.proposal, source: 'llm' };
    } catch (err) {
      if (err instanceof InvalidModelOutput) {
        lastInvalid = err;
        continue;
      }
      throw err; // UnusableInputError (or anything else) propagates — no retry
    }
  }

  throw (lastInvalid ?? new InvalidModelOutput('json')).friendly();
}

export async function generatePalette(
  input: GenerateInput,
): Promise<GenerateResult> {
  const { proposal, source } = await getProposal(input);
  return assembleResult(proposal, source);
}
