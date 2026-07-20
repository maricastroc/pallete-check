'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Lock,
  ScanLine,
  Sparkles,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
import type { Palette, RepairStep, TokenName } from '@/lib/color';
import { oklchToHex } from '@/lib/color';
import { useInViewOnce } from '@/components/useInViewOnce';
import { LuminanceAxis } from '@/components/instrument/LuminanceAxis';

function feasibleBand(step: RepairStep): [number, number] | null {
  let lo = 0;
  let hi = 1;
  for (const c of step.constraints) {
    const [a, b] = c.feasible;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    lo = Math.max(lo, a);
    hi = Math.min(hi, b);
  }
  return hi > lo ? [lo, hi] : null;
}

const STAGES = [
  { key: 'proposal', label: 'Proposal', sub: 'model', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'verify', label: 'Verify', sub: 'WCAG', icon: <ScanLine className="h-4 w-4" /> },
  { key: 'repair', label: 'Repair', sub: 'L-axis only', icon: <SlidersHorizontal className="h-4 w-4" /> },
  { key: 'verified', label: 'Verified', sub: 'guaranteed', icon: <BadgeCheck className="h-4 w-4" /> },
];

function Pipeline() {
  return (
    <div className="flex flex-wrap items-stretch gap-1.5 rounded-2xl border border-black/8 bg-white p-2 shadow-sm sm:flex-nowrap sm:gap-2 sm:p-2.5">
      {STAGES.map((s, i) => {
        const last = i === STAGES.length - 1;
        const active = i === 2;
        const done = i === 3;
        return (
          <div
            key={s.key}
            className="flex w-[calc(50%-0.375rem)] items-center gap-1.5 sm:w-auto sm:flex-1 sm:gap-2"
          >
            <div
              className={`flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 ${
                active
                  ? 'bg-zinc-950 text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-zinc-50 text-ink-2'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  active ? 'bg-white/15' : done ? 'bg-emerald-100' : 'bg-white'
                }`}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight">{s.label}</div>
                <div className="coord text-[9px] uppercase tracking-[0.1em] opacity-70">{s.sub}</div>
              </div>
            </div>
            {!last && <ArrowRight className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" />}
          </div>
        );
      })}
    </div>
  );
}

function Invariant({
  icon,
  label,
  value,
  moved,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  moved?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
        moved
          ? 'border-zinc-900/15 bg-zinc-950 text-white'
          : 'border-black/8 bg-zinc-50 text-ink-2'
      }`}
    >
      <span className={moved ? 'text-white/70' : 'text-ink-3'}>{icon}</span>
      <span className="coord text-[10px] uppercase tracking-wide">{label}</span>
      <span className="coord text-[11px] font-semibold">{value}</span>
    </span>
  );
}

function SwatchTile({ hex, l, state }: { hex: string; l: number; state: 'ai' | 'pass' | 'warn' }) {
  const badge =
    state === 'ai' ? 'bg-rose-500' : state === 'pass' ? 'bg-emerald-500' : 'bg-amber-500';
  const label =
    state === 'ai' ? 'AI proposal' : state === 'pass' ? 'Repaired' : 'Best effort';
  const labelColor =
    state === 'ai' ? 'text-rose-500' : state === 'pass' ? 'text-emerald-600' : 'text-amber-600';
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="relative h-11 w-11 shrink-0 rounded-xl ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: hex }}
      >
        <span
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white ${badge}`}
        >
          {state === 'pass' ? '✓' : '✕'}
        </span>
      </span>
      <div>
        <div className={`coord text-[9px] font-semibold uppercase tracking-[0.1em] ${labelColor}`}>
          {label}
        </div>
        <div className="coord text-[13px] font-semibold text-zinc-900 tnum">L {l.toFixed(3)}</div>
      </div>
    </div>
  );
}

function TraceCard({ step, palette }: { step: RepairStep; palette: Palette }) {
  const { c, h } = palette[step.token];
  const proposed = { l: step.proposedL, c, h };
  const repaired = { l: step.repairedL, c, h };
  const proposedHex = oklchToHex(proposed);
  const repairedHex = oklchToHex(repaired);
  const band = feasibleBand(step);
  const passed = step.passedAfter;
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <div ref={ref} className="bracket rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="coord text-[14px] font-semibold text-zinc-900">{step.token}</span>
        {step.bindingRule && (
          <span className="coord rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] text-ink-2">
            {step.bindingRule.fg} → {step.bindingRule.bg} ≥ {step.bindingRule.min.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mb-5 flex items-center justify-between gap-2">
        <SwatchTile hex={proposedHex} l={step.proposedL} state="ai" />
        <div className="flex flex-col items-center gap-1 px-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
            {step.proposedRatio.toFixed(2)}
          </span>
          <ArrowRight className="h-4 w-4 text-ink-3" />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {step.repairedRatio.toFixed(2)}
          </span>
        </div>
        <SwatchTile hex={repairedHex} l={step.repairedL} state={passed ? 'pass' : 'warn'} />
      </div>

      <LuminanceAxis
        hue={{ c, h }}
        band={band}
        animate
        inView={inView}
        nodes={[
          { l: step.proposedL, color: proposedHex, ring: 'fail', z: 1 },
          {
            l: step.repairedL,
            color: repairedHex,
            ring: passed ? 'pass' : 'warn',
            fromL: step.proposedL,
            glow: passed,
            z: 2,
          },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Invariant icon={<Lock className="h-3 w-3" />} label="H" value={`${Math.round(h)}°`} />
        <Invariant icon={<Lock className="h-3 w-3" />} label="C" value={c.toFixed(3)} />
        <Invariant
          icon={<SlidersHorizontal className="h-3 w-3" />}
          label="ΔL"
          value={`${step.deltaL >= 0 ? '+' : ''}${step.deltaL.toFixed(3)}`}
          moved
        />
      </div>
    </div>
  );
}

export function RepairTrace({
  trace,
  infeasible,
  palette,
}: {
  trace: RepairStep[];
  infeasible: TokenName[];
  palette: Palette;
}) {
  const repaired = trace.filter((s) => Math.abs(s.deltaL) > 1e-6);

  return (
    <div className="space-y-6">
      <Pipeline />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <span className="coord mt-0.5 shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            H·C locked
          </span>
          <p className="max-w-xl text-[14px] leading-relaxed text-zinc-600">
            {repaired.length > 0 ? (
              <>
                The model chose the hue and chroma. Where a color missed a contrast rule, the engine
                slides it along the <span className="font-semibold text-zinc-900">luminance axis</span>{' '}
                — <span className="font-semibold text-zinc-900">{repaired.length} token{repaired.length > 1 ? 's' : ''}</span>{' '}
                repaired, nothing regenerated. Each marker travels from fail into the shaded feasible band.
              </>
            ) : (
              <>The proposal already satisfied every contrast rule — no repair was needed.</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-rose-500 bg-white" />
            proposal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-white" />
            repaired
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-4 rounded-[3px]"
              style={{
                background: 'repeating-linear-gradient(45deg, rgba(5,150,105,0.18) 0 3px, transparent 3px 6px)',
                boxShadow: 'inset 0 0 0 1px rgba(5,150,105,0.4)',
              }}
            />
            feasible band
          </span>
        </div>
      </div>

      {repaired.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {repaired.map((s, i) => {
            const spanFull = i === repaired.length - 1 && repaired.length % 2 === 1;
            return (
              <div key={s.token} className={spanFull ? 'lg:col-span-2' : ''}>
                <TraceCard step={s} palette={palette} />
              </div>
            );
          })}
        </div>
      )}

      {infeasible.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
        >
          <TriangleAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <div className="text-[13px] font-semibold text-amber-900">
              Impossible to satisfy with lightness alone
            </div>
            <div className="mt-0.5 text-[13px] text-amber-700">
              <span className="coord">{infeasible.join(', ')}</span> — at this hue and chroma, no
              lightness clears every rule. The engine reports it instead of hiding it.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
