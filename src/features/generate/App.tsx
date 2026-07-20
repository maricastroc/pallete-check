'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Check, Eye, Link2, SlidersHorizontal } from 'lucide-react';
import type { OKLCH, Theme, ThemeSet, TokenName } from '@/lib/color';
import { clampChromaToGamut, oklchToHex } from '@/lib/color';
import { useInViewOnce } from '@/components/useInViewOnce';
import type { GenerateResult } from '@/features/llm/types';
import { assembleFromMaterialized, type ResultMeta } from '@/features/llm/generate';
import { Segmented } from '@/components/ui/Segmented';
import { SpecimenBoard } from '@/features/result/SpecimenBoard';
import { TokenTuner } from '@/features/result/TokenTuner';
import { ThemesPanel } from '@/features/result/ThemesPanel';
import { AuditMatrix } from '@/features/result/AuditMatrix';
import { RepairTrace } from '@/features/result/RepairTrace';
import { ExportPanel } from '@/features/result/ExportPanel';
import { PromptBar, type FormState } from './PromptBar';
import { DEFAULT_INPUT, DEFAULT_RESULT, PRESETS, type Preset } from './defaults';
import { encodePalette, decodePalette } from './share';
import {
  ColorVisionFilters,
  visionFilter,
  type VisionMode,
} from '@/components/instrument/ColorVisionFilters';

type Status = 'idle' | 'loading' | 'error';

const VISION_MODES: { value: VisionMode; label: string; caption: string }[] = [
  { value: 'normal', label: 'Normal', caption: '' },
  {
    value: 'protanopia',
    label: 'Protanopia',
    caption: 'Protanopia — red-cone blindness. Reds darken and can slide toward green.',
  },
  {
    value: 'deuteranopia',
    label: 'Deuteranopia',
    caption: 'Deuteranopia — green-cone blindness, the most common type (~5% of men).',
  },
  {
    value: 'tritanopia',
    label: 'Tritanopia',
    caption: 'Tritanopia — blue-cone blindness. Rare; blues and greens converge.',
  },
  {
    value: 'grayscale',
    label: 'Grayscale',
    caption: 'Grayscale — the ultimate test: does anything here rely on color alone?',
  },
];

function Section({
  n,
  title,
  note,
  aside,
  children,
}: {
  n: string;
  title: string;
  note?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={ref}
      className="mx-auto max-w-6xl px-6"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : 'translateY(20px)',
        transition: 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <div className="mb-7 flex items-end justify-between gap-4 border-b border-black/8 pb-4">
        <div className="flex items-center gap-3">
          <span className="coord rounded-md border border-black/10 bg-white px-1.5 py-1 text-[10px] font-medium text-ink-2">
            {n}
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
            {note && (
              <div className="coord mt-0.5 text-[10px] uppercase tracking-widest text-ink-3">{note}</div>
            )}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function App() {
  const [fields, setFields] = useState<FormState>(DEFAULT_INPUT);
  const [result, setResult] = useState<GenerateResult>(DEFAULT_RESULT);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [morphing, setMorphing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [vision, setVision] = useState<VisionMode>('normal');
  const [tuning, setTuning] = useState(false);
  const [edited, setEdited] = useState(false);
  const [baseResult, setBaseResult] = useState<GenerateResult>(DEFAULT_RESULT);
  const morphTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const workMat = useRef<ThemeSet | null>(null);

  function triggerMorph() {
    setMorphing(true);
    clearTimeout(morphTimer.current);
    morphTimer.current = setTimeout(() => setMorphing(false), 750);
  }

  useEffect(() => () => clearTimeout(morphTimer.current), []);

  function commitBase(r: GenerateResult) {
    workMat.current = null;
    setResult(r);
    setBaseResult(r);
    setEdited(false);
  }

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('p');
    if (!encoded) return;
    const decoded = decodePalette(encoded);
    if (!decoded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    commitBase(decoded);
    setHasGenerated(true);
  }, []);

  function editToken(token: TokenName, patch: Partial<OKLCH>) {
    const base =
      workMat.current ?? { light: { ...result.proposal.light }, dark: { ...result.proposal.dark } };
    const merged = clampChromaToGamut({ ...base[theme][token], ...patch });
    const themePalette = { ...base[theme], [token]: merged };

    if (token === 'primary' && patch.h !== undefined) {
      for (const t of ['primaryHover', 'primaryActive', 'focusRing', 'selection'] as TokenName[]) {
        themePalette[t] = clampChromaToGamut({ ...themePalette[t], h: merged.h });
      }
    }
    const next: ThemeSet = { ...base, [theme]: themePalette };
    workMat.current = next;
    const meta: ResultMeta = {
      name: result.name,
      rationale: result.rationale,
      scheme: result.scheme,
      source: result.source,
    };
    setResult(assembleFromMaterialized(next, meta));
    setEdited(true);
    setHasGenerated(true);
  }

  function resetTune() {
    commitBase(baseResult);
    triggerMorph();
  }

  function share() {
    const url = `${window.location.origin}${window.location.pathname}?p=${encodePalette(result)}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1800);
      },
      () => {},
    );
  }

  async function generate(input: FormState = fields) {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Generation failed.');
      commitBase(data as GenerateResult);
      setHasGenerated(true);
      setStatus('idle');
      triggerMorph();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.');
      setStatus('idle');
    }
  }

  function applyPreset(p: Preset) {
    setFields(p.fields);
    commitBase(p.result);
    setHasGenerated(true);
    setError(null);
    setStatus('idle');
    triggerMorph();
  }

  const activePalette = result.themes[theme];
  const glow = oklchToHex(activePalette.primary);
  const harmony = result.harmony[theme];
  const loading = status === 'loading';
  const visionCaption = VISION_MODES.find((m) => m.value === vision)?.caption ?? '';

  return (
    <div className="pb-32">
      <ColorVisionFilters />
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.9 }}
            exit={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ transformOrigin: 'left' }}
            className="fixed inset-x-0 top-0 z-50 h-0.5 bg-zinc-900"
          />
        )}
      </AnimatePresence>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-4 w-7 items-center rounded-full bg-linear-to-r from-zinc-950 via-zinc-500 to-zinc-100 ring-1 ring-inset ring-black/15">
            <span className="absolute left-[62%] h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow-sm ring-2 ring-zinc-900" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Palette Check</span>
        </div>
        <span className="coord hidden text-[11px] uppercase tracking-[0.12em] text-ink-3 sm:block">
          LLM proposes · Math guarantees
        </span>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="dotgrid pointer-events-none absolute inset-x-0 top-0 h-140"
          style={{ maskImage: 'radial-gradient(80% 60% at 50% 0%, black, transparent)', WebkitMaskImage: 'radial-gradient(80% 60% at 50% 0%, black, transparent)' }}
        />

        <div className="mx-auto max-w-6xl px-6 pt-10 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-ink-3">
              Accessible design tokens
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-950 sm:text-5xl lg:text-[3.5rem]">
              Generate the palette.
              <br />
              <span className="text-ink-3">Guarantee the contrast.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-ink-2">
              Describe a product and get accessible light &amp; dark tokens — proposed by a model,
              verified against WCAG, and repaired where it missed.
            </p>
          </div>

          <div className="relative mt-12">
            <div
              className="pointer-events-none absolute -inset-x-8 -top-8 bottom-8 -z-10 opacity-30 blur-3xl transition-colors duration-700"
              style={{ background: `radial-gradient(55% 50% at 50% 35%, ${glow}, transparent 70%)` }}
            />
            <div className="mb-4 flex flex-col items-center gap-2.5">
              <Segmented
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                value={theme}
                onChange={setTheme}
              />
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="coord flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-3">
                  <Eye className="h-3 w-3" />
                  Vision
                </span>
                {VISION_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setVision(m.value)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      vision === m.value
                        ? 'bg-zinc-900 text-white'
                        : 'border border-black/10 bg-white text-ink-2 hover:border-black/20 hover:text-zinc-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative mx-auto max-w-4xl">
              <div
                style={{
                  filter: visionFilter(vision),
                  transition: 'filter 0.25s var(--ease-instrument)',
                }}
              >
                <SpecimenBoard palette={activePalette} morphing={morphing} />
              </div>
              <div className="mt-3 flex min-h-4 items-center justify-center">
                {visionCaption && (
                  <span className="coord text-center text-[11px] text-ink-2">{visionCaption}</span>
                )}
              </div>
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-start justify-center rounded-2xl bg-white/30 pt-6 backdrop-blur-[1px]"
                  >
                    <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg">
                      Generating…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setTuning((t) => !t)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  tuning
                    ? 'bg-zinc-900 text-white'
                    : 'border border-black/10 bg-white text-zinc-600 hover:border-black/20 hover:text-zinc-900'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {tuning ? 'Close tuner' : 'Tune tokens'}
              </button>
            </div>
            {tuning && (
              <div className="mx-auto mt-4 max-w-4xl">
                <TokenTuner
                  palette={activePalette}
                  theme={theme}
                  trace={result.trace[theme]}
                  edited={edited}
                  onEdit={editToken}
                  onReset={resetTune}
                />
              </div>
            )}
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <PromptBar
              value={fields}
              loading={loading}
              onChange={(patch) => setFields((f) => ({ ...f, ...patch }))}
              onSubmit={() => generate()}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <span className="coord text-[11px] uppercase tracking-wide text-ink-3">Presets</span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  disabled={loading}
                  className="rounded-full border border-black/8 bg-white px-2.5 py-1 text-[12px] text-zinc-600 transition-colors hover:border-black/20 hover:text-zinc-900 disabled:opacity-40"
                >
                  {p.label}
                </button>
              ))}
            </div>
            {error && (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-[13px] text-rose-700">
                {error}
              </div>
            )}
          </div>

          <div className="mx-auto mt-14 max-w-2xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-lg font-semibold tracking-tight text-zinc-900">{result.name}</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[12px] font-medium capitalize text-zinc-600">
                {result.scheme}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                  harmony.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {harmony.ok ? 'In harmony' : `${harmony.deviations.length} off-scheme`}
              </span>
              <span className="coord rounded-full border border-black/8 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-2">
                {edited ? 'Tuned' : !hasGenerated ? 'Sample' : result.source === 'mock' ? 'Preset' : 'AI-generated'}
              </span>
            </div>
            <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-ink-2">
              {result.rationale}
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 shadow-sm transition-colors hover:border-black/20 hover:text-zinc-900"
              >
                {shareCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
                    Link copied
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Share this palette
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-28 space-y-28">
        <Section n="01" title="Light & dark tokens" note="18 semantic tokens · OKLCH coordinates">
          <ThemesPanel light={result.themes.light} dark={result.themes.dark} />
        </Section>

        <Section
          n="02"
          title="Accessibility audit"
          note="19 WCAG 2.1 contrast rules"
          aside={
            <Segmented
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={theme}
              onChange={setTheme}
              size="sm"
            />
          }
        >
          <AuditMatrix report={result.audit[theme]} palette={result.themes[theme]} />
        </Section>

        <Section
          n="03"
          title="Repair trace"
          note="luminance-only correction"
          aside={
            <Segmented
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={theme}
              onChange={setTheme}
              size="sm"
            />
          }
        >
          <RepairTrace
            trace={result.trace[theme]}
            infeasible={result.infeasible[theme]}
            palette={result.themes[theme]}
          />
        </Section>

        <Section n="04" title="Export" note="CSS · JSON · Tailwind · DTCG">
          <ExportPanel themes={result.themes} />
        </Section>
      </div>

      <footer className="mx-auto mt-28 max-w-6xl px-6">
        <div className="flex flex-col gap-3 border-t border-black/8 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[13px] leading-relaxed text-ink-2">
            <span className="font-medium text-zinc-800">Accessibility ≠ aesthetics.</span> The engine
            guarantees contrast — not beauty. Beauty stays the model&apos;s job.
          </p>
          <a
            href="https://www.w3.org/TR/WCAG21/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 transition-colors hover:text-zinc-900"
          >
            Built on WCAG 2.1
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
