'use client';

import { useState } from 'react';
import type { Palette, Theme, TokenName } from '@/lib/color';
import { ALL_TOKENS } from '@/lib/color';
import { Readout } from '@/components/instrument/Readout';
import { hex } from './tokens';

const GROUPS: { label: string; hint: string; tokens: TokenName[] }[] = [
  { label: 'Surfaces', hint: 'back → front', tokens: ['bg', 'surface', 'surfaceElevated', 'selection'] },
  { label: 'Text', hint: 'strong → muted', tokens: ['text', 'textSecondary', 'textDisabled'] },
  { label: 'Brand', hint: 'rest → press → on', tokens: ['primary', 'primaryHover', 'primaryActive', 'onPrimary'] },
  { label: 'Signal', hint: 'semantic states', tokens: ['danger', 'warning', 'success', 'info'] },
  { label: 'Structure', hint: 'lines & focus', tokens: ['border', 'borderStrong', 'focusRing'] },
];

function Tile({ token, palette }: { token: TokenName; palette: Palette }) {
  const [copied, setCopied] = useState(false);
  const color = palette[token];
  const value = hex(color);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
          },
          () => {},
        );
      }}
      className="group/tile flex items-center gap-2.5 rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-black/8 hover:bg-white"
    >
      <span
        className="h-9 w-9 shrink-0 rounded-md ring-1 ring-inset ring-black/10 transition-transform group-hover/tile:scale-[1.04]"
        style={{ backgroundColor: value }}
      />
      <span className="min-w-0 flex-1">
        <span className="coord block truncate text-[11px] font-medium text-zinc-800">{token}</span>
        <span className="mt-0.5 block">
          {copied ? (
            <span className="coord text-[10px] font-medium uppercase text-emerald-700">copied {value}</span>
          ) : (
            <Readout color={color} size="xs" />
          )}
        </span>
      </span>
    </button>
  );
}

function ToneMap({ palette }: { palette: Palette }) {
  const track = 'linear-gradient(90deg, #000, #fff)';
  return (
    <div className="select-none">
      <div className="coord mb-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-ink-3">
        <span>Luminance map</span>
        <span>18 tokens</span>
      </div>
      <div className="relative h-6">
        <div
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundImage: track }}
        />
        {ALL_TOKENS.map((t) => (
          <span
            key={t}
            title={t}
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white"
            style={{
              left: `${(Math.max(0, Math.min(1, palette[t].l)) * 100).toFixed(2)}%`,
              backgroundColor: hex(palette[t]),
              boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}
          />
        ))}
      </div>
      <div className="tickrule mt-1 h-1 opacity-50" />
      <div className="coord mt-1 flex justify-between text-[9px] text-ink-3">
        <span>0.0</span>
        <span>0.5</span>
        <span>1.0 · L</span>
      </div>
    </div>
  );
}

function ThemeColumn({ theme, palette }: { theme: Theme; palette: Palette }) {
  return (
    <div className="bracket rounded-2xl border border-black/8 bg-[color:var(--color-panel)] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: hex(palette.bg) }}
        >
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: hex(palette.primary) }} />
        </span>
        <span className="text-[13px] font-semibold capitalize text-zinc-900">{theme}</span>
        <span className="coord ml-auto text-[10px] uppercase tracking-wide text-ink-3">
          oklch
        </span>
      </div>

      <ToneMap palette={palette} />

      <div className="mt-5 space-y-4">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-2">
                {group.label}
              </span>
              <span className="coord text-[9px] text-ink-3">{group.hint}</span>
              <span className="ml-auto h-px flex-1 bg-black/5" />
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              {group.tokens.map((t) => (
                <Tile key={t} token={t} palette={palette} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemesPanel({ light, dark }: { light: Palette; dark: Palette }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ThemeColumn theme="light" palette={light} />
      <ThemeColumn theme="dark" palette={dark} />
    </div>
  );
}
