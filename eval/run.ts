import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GenerateInput } from '@/features/llm/schema';
import { GOLDEN_SET_VERSION, SWEEP, VARIANCE, type GoldenCase } from './golden';
import { EVAL_MODEL, getRawOutput, type ProbeMode } from './probe';
import { evaluateCall, varianceStat, type CallMetrics } from './metrics';
import { buildReport, renderTerminal } from './report';

/**
 * Entrypoint for `npm run eval`. Runs the versioned golden set against the mock
 * (offline, deterministic — default when no GROQ_API_KEY) or the real model
 * (gated by GROQ_API_KEY). NOT part of `npm test`: it costs API calls and is
 * non-deterministic against the real model.
 */

interface Cli {
  mode: ProbeMode;
  temperature: number;
  repeats: number;
  variance: boolean;
}

function parseCli(argv: string[]): Cli {
  const has = (flag: string): boolean => argv.includes(flag);
  const valueOf = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const hasKey = Boolean(process.env.GROQ_API_KEY);
  let mode: ProbeMode = hasKey ? 'real' : 'mock';
  if (has('--mock')) mode = 'mock';
  if (has('--real')) mode = 'real';

  const envTemp = process.env.GROQ_TEMPERATURE
    ? Number(process.env.GROQ_TEMPERATURE)
    : undefined;
  const cliTemp = valueOf('--temp');
  const temperature = cliTemp !== undefined ? Number(cliTemp) : (envTemp ?? 0.7);

  const repeats = valueOf('--repeats') !== undefined ? Number(valueOf('--repeats')) : VARIANCE.repeats;

  return {
    mode,
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
    repeats: Number.isFinite(repeats) && repeats > 0 ? Math.floor(repeats) : VARIANCE.repeats,
    variance: !has('--no-variance'),
  };
}

const log = (msg: string): void => {
  process.stderr.write(`${msg}\n`);
};

async function probeOne(
  input: GenerateInput,
  cli: Cli,
): Promise<CallMetrics> {
  const raw = await getRawOutput(input, { temperature: cli.temperature, mode: cli.mode });
  if (raw.error) log(`    ! ${input.productType} / ${input.scheme}: ${raw.error}`);
  return evaluateCall(raw);
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  if (cli.mode === 'real' && !process.env.GROQ_API_KEY) {
    log('✗ --real requires GROQ_API_KEY. Set it in .env.local or drop --real for the mock.');
    process.exitCode = 1;
    return;
  }

  const model = cli.mode === 'mock' ? 'mock' : EVAL_MODEL;
  log(`\n▸ Eval: mode=${cli.mode} model=${model} temp=${cli.temperature} — ${SWEEP.length} sweep cases`);

  // Sweep (one call per case, sequential to stay gentle on rate limits).
  const sweep: Array<{ id: string; metrics: CallMetrics }> = [];
  for (const c of SWEEP) {
    const metrics = await probeOne(c, cli);
    sweep.push({ id: c.id, metrics });
    log(`  ${c.id}  ${c.productType} / ${c.vibe} / ${c.scheme}`);
  }

  // Variance (N repeats of a small subset).
  const variance = [];
  if (cli.variance) {
    log(`\n▸ Variance: ${VARIANCE.cases.length} cases × ${cli.repeats} repeats`);
    for (const c of VARIANCE.cases as readonly GoldenCase[]) {
      const calls: CallMetrics[] = [];
      for (let i = 0; i < cli.repeats; i++) calls.push(await probeOne(c, cli));
      variance.push(varianceStat(c.id, c, calls));
      log(`  ${c.id}  ${c.productType} / ${c.vibe} / ${c.scheme}`);
    }
  }

  const timestamp = new Date().toISOString();
  const report = buildReport({
    goldenSetVersion: GOLDEN_SET_VERSION,
    model,
    mode: cli.mode,
    temperature: cli.temperature,
    timestamp,
    sweep,
    variance,
  });

  const dir = join(process.cwd(), 'eval', 'reports');
  await mkdir(dir, { recursive: true });
  const safeModel = model.replace(/[^a-z0-9._-]+/gi, '-');
  const safeStamp = timestamp.replace(/[:.]/g, '-');
  const file = join(dir, `${cli.mode}-${safeModel}-${safeStamp}.json`);
  await writeFile(file, JSON.stringify(report, null, 2), 'utf8');

  // Report to stdout (clean); progress went to stderr.
  process.stdout.write(renderTerminal(report) + '\n');
  log(`\n✓ JSON report written to ${file}\n`);
}

main().catch((err) => {
  log(`✗ eval failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  process.exitCode = 1;
});
