import Groq from 'groq-sdk';
import { assembleResult } from './generate';
import { mockProposal } from './mock';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { ProposalSchema, type GenerateInput, type Proposal } from './schema';
import type { GenerateResult } from './types';

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// Optional sampling temperature (LLM is stochastic; higher = more varied).
// Omitted entirely when unset so the model/SDK default applies.
const TEMPERATURE = ((): number | undefined => {
  const t = Number(process.env.GROQ_TEMPERATURE);
  return process.env.GROQ_TEMPERATURE !== undefined && Number.isFinite(t) ? t : undefined;
})();

// One initial attempt + one retry: a reroll usually fixes an occasional bad
// draw, without hammering the API on a genuinely broken model/prompt.
const MAX_ATTEMPTS = 2;

/** A stochastic bad draw (bad JSON / wrong shape / empty) — worth one reroll. */
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

function parseProposal(content: string): Proposal {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new InvalidModelOutput('json');
  }
  const parsed = ProposalSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidModelOutput('shape');
  return parsed.data;
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
      // Transport/API errors (auth, rate, 5xx) are not worth a reroll.
      if (err instanceof InvalidModelOutput) {
        lastInvalid = err;
        continue;
      }
      throw friendlyError(err);
    }

    try {
      return { proposal: parseProposal(content), source: 'llm' };
    } catch (err) {
      if (err instanceof InvalidModelOutput) {
        lastInvalid = err;
        continue;
      }
      throw err;
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
