/**
 * The generation pipeline: proposal → materialize → verify → repair → verify →
 * checkHarmony → assembled GenerateResult.
 *
 * The LLM proposes; the math guarantees. There is no regenerate loop — a failing
 * proposal is repaired, never re-rolled.
 */

import { checkHarmony, repair, verify } from '@/lib/color';
import type { Proposal } from './schema';
import { materialize } from './materialize';
import type { GenerateResult } from './types';
import { TOKEN_DESCRIPTIONS } from './types';

/** Run the deterministic pipeline over a (real or mock) proposal. */
export function assembleResult(
  proposal: Proposal,
  source: 'llm' | 'mock',
): GenerateResult {
  const materialized = materialize(proposal);

  const light = repair(materialized.light);
  const dark = repair(materialized.dark);
  const themes = { light: light.palette, dark: dark.palette };

  return {
    name: proposal.name,
    rationale: proposal.rationale,
    scheme: proposal.scheme,
    source,

    proposal: materialized,
    themes,

    auditBefore: {
      light: verify(materialized.light, 'light'),
      dark: verify(materialized.dark, 'dark'),
    },
    audit: {
      light: verify(themes.light, 'light'),
      dark: verify(themes.dark, 'dark'),
    },
    trace: { light: light.trace, dark: dark.trace },
    infeasible: { light: light.infeasible, dark: dark.infeasible },
    harmony: {
      light: checkHarmony(themes.light, proposal.scheme),
      dark: checkHarmony(themes.dark, proposal.scheme),
    },

    descriptions: TOKEN_DESCRIPTIONS,
  };
}
