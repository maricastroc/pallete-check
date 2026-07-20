'use client';

import { useState } from 'react';
import { Check, Lock, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { OKLCH, Palette, RepairStep, Theme, TokenName } from '@/lib/color';
import { ALL_TOKENS, ANCHOR_TOKENS, oklchToHex } from '@/lib/color';

const MAX_C = 0.37;
const isAnchor = (t: TokenName) => (ANCHOR_TOKENS as readonly TokenName[]).includes(t);

function sweep(fn: (t: number) => OKLCH, steps = 18): string {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) stops.push(oklchToHex(fn(i / steps)));
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  gradient,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  gradient: string;
  display: string;
  disabled?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="coord flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-2">
          {label}
          {disabled && <Lock className="h-2.5 w-2.5 text-ink-3" />}
        </span>
        <span className="coord text-[11px] font-semibold text-zinc-900 tnum">{display}</span>
      </div>
      <div className="relative h-5">
        <div
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundImage: gradient, opacity: disabled ? 0.4 : 1 }}
        />
        <input
          type="range"
          className="tuner absolute inset-0 w-full"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}

export function TokenTuner({
  palette,
  theme,
  trace,
  edited,
  onEdit,
  onReset,
}: {
  palette: Palette;
  theme: Theme;
  trace: RepairStep[];
  edited: boolean;
  onEdit: (token: TokenName, patch: Partial<OKLCH>) => void;
  onReset: () => void;
}) {
  const [selected, setSelected] = useState<TokenName>('primary');
  const cur = palette[selected];
  const anchor = isAnchor(selected);
  const step = trace.find((s) => s.token === selected);

  return (
    <div className="bracket rounded-2xl border border-black/10 bg-[color:var(--color-panel)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-ink-2" />
          <span className="text-[13px] font-semibold text-zinc-900">Tune tokens</span>
          <span className="coord hidden text-[10px] uppercase tracking-wide text-ink-3 sm:block">
            {theme} · you pick hue &amp; chroma, math owns lightness
          </span>
        </div>
        {edited && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-900"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* token selector */}
      <div className="mb-4 flex flex-wrap gap-1">
        {ALL_TOKENS.map((t) => {
          const on = t === selected;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSelected(t)}
              title={t}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px] transition-colors ${
                on ? 'bg-zinc-900 text-white' : 'text-ink-2 hover:bg-black/5'
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-[4px] ring-1 ring-inset ring-black/15"
                style={{ backgroundColor: oklchToHex(palette[t]) }}
              />
              <span className="coord">{t}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,150px)_1fr]">
        {/* selected preview + status */}
        <div className="flex gap-3 sm:flex-col">
          <span
            className="h-16 w-16 shrink-0 rounded-xl ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: oklchToHex(cur) }}
          />
          <div className="min-w-0">
            <div className="coord text-[12px] font-semibold text-zinc-900">{selected}</div>
            {anchor ? (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                Anchor · fixed
              </div>
            ) : step ? (
              <div
                className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                  step.passedAfter
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {step.passedAfter ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : (
                  <X className="h-2.5 w-2.5" strokeWidth={3} />
                )}
                {step.repairedRatio.toFixed(2)}
                {step.infeasible ? ' · infeasible' : ''}
              </div>
            ) : (
              <div className="mt-1 text-[10px] text-ink-3">repaired token</div>
            )}
            {!anchor && step?.bindingRule && (
              <div className="coord mt-1 text-[9px] text-ink-3">
                {step.bindingRule.fg} → {step.bindingRule.bg} ≥ {step.bindingRule.min.toFixed(1)}
              </div>
            )}
          </div>
        </div>

        {/* sliders */}
        <div className="space-y-3">
          <Slider
            label="L"
            value={cur.l}
            min={0}
            max={1}
            step={0.001}
            display={cur.l.toFixed(3)}
            disabled={!anchor}
            gradient={sweep((t) => ({ l: t, c: cur.c, h: cur.h }))}
            onChange={anchor ? (v) => onEdit(selected, { l: v }) : undefined}
          />
          <Slider
            label="C"
            value={cur.c}
            min={0}
            max={MAX_C}
            step={0.001}
            display={cur.c.toFixed(3)}
            gradient={sweep((t) => ({ l: cur.l, c: t * MAX_C, h: cur.h }))}
            onChange={(v) => onEdit(selected, { c: v })}
          />
          <Slider
            label="H"
            value={cur.h}
            min={0}
            max={360}
            step={1}
            display={`${Math.round(cur.h)}°`}
            gradient={sweep((t) => ({ l: cur.l, c: cur.c, h: t * 360 }), 24)}
            onChange={(v) => onEdit(selected, { h: v })}
          />
        </div>
      </div>

      {!anchor && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-relaxed text-ink-2">
          <Lock className="h-3 w-3 shrink-0 text-ink-3" />
          Lightness is owned by the repair engine — change hue or chroma and watch it re-solve.
        </p>
      )}
    </div>
  );
}
