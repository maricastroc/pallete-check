/**
 * Server-only: the creative step.
 *
 * Calls Claude for a structured palette proposal, then hands it to the
 * deterministic pipeline. Falls back to a deterministic offline mock when no
 * ANTHROPIC_API_KEY is present, so the app runs end-to-end without a key.
 *
 * Do not import this module from client components — it reaches for the
 * Anthropic SDK and the API key.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { assembleResult } from './generate';
import { mockProposal } from './mock';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { ProposalSchema, type GenerateInput, type Proposal } from './schema';
import type { GenerateResult } from './types';

const MODEL = 'claude-opus-4-8';

async function getProposal(
  input: GenerateInput,
): Promise<{ proposal: Proposal; source: 'llm' | 'mock' }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { proposal: mockProposal(input), source: 'mock' };
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
    output_config: { format: zodOutputFormat(ProposalSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error('The model did not return a valid palette proposal.');
  }
  return { proposal: parsed, source: 'llm' };
}

/** End-to-end: creative proposal → guaranteed-accessible tokens. */
export async function generatePalette(
  input: GenerateInput,
): Promise<GenerateResult> {
  const { proposal, source } = await getProposal(input);
  return assembleResult(proposal, source);
}
