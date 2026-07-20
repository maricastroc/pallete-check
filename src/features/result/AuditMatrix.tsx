'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, Check, TriangleAlert, X } from 'lucide-react';
import type { ConstraintResult, Palette, TokenName, VerifyReport } from '@/lib/color';
import { apcaContrast, apcaThreshold } from '@/lib/color';
import { Segmented } from '@/components/ui/Segmented';
import { hex } from './tokens';

type Method = 'wcag' | 'apca';

const GROUPS: { label: string; hint: string; fg: TokenName[] }[] = [
  { label: 'Text on surfaces', hint: 'readability', fg: ['text', 'textSecondary', 'textDisabled'] },
  { label: 'Text on brand', hint: 'on-color legibility', fg: ['onPrimary'] },
  { label: 'Signal on surface', hint: 'status colors', fg: ['danger', 'warning', 'success', 'info'] },
  { label: 'UI & focus', hint: 'non-text', fg: ['border', 'borderStrong', 'focusRing'] },
];

const PASS = '#059669';
const FAIL = '#d97706';

function Chip({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-[4px] ring-1 ring-inset ring-black/10"
      style={{ backgroundColor: color }}
    />
  );
}

function Gauge({
  value,
  threshold,
  min,
  max,
  pass,
}: {
  value: number;
  threshold: number;
  min: number;
  max: number;
  pass: boolean;
}) {
  const pos = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;
  const vPos = pos(value);
  const tPos = pos(threshold);
  const fill = pass ? PASS : FAIL;

  return (
    <div className="relative h-5 flex-1">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-zinc-100" />
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
        style={{ left: 0, width: `${vPos.toFixed(2)}%`, backgroundColor: fill }}
      />
      <span
        className="absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-zinc-900/70"
        style={{ left: `${tPos.toFixed(2)}%` }}
      />
    </div>
  );
}

function Level({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`coord inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold ${
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-ink-3'
      }`}
    >
      {ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      {label}
    </span>
  );
}

function Row({
  result,
  palette,
  method,
}: {
  result: ConstraintResult;
  palette: Palette;
  method: Method;
}) {
  const { rule } = result;
  const lc = apcaContrast(palette[rule.fg], palette[rule.bg]);
  const apcaThr = apcaThreshold(rule.kind);
  const apcaPass = Math.abs(lc) >= apcaThr;
  const wcag = method === 'wcag';

  return (
    <div className="flex items-center gap-3 py-2 pl-1 pr-2 transition-colors hover:bg-white">
      <div className="flex w-44 shrink-0 items-center gap-1.5 sm:w-56">
        <Chip color={hex(palette[rule.fg])} />
        <span className="coord shrink-0 text-[11px] text-zinc-800">{rule.fg}</span>
        <span className="text-ink-3">/</span>
        <Chip color={hex(palette[rule.bg])} />
        <span className="coord truncate text-[11px] text-ink-3">{rule.bg}</span>
      </div>

      {wcag ? (
        <Gauge value={result.ratio} threshold={rule.min} min={1} max={21} pass={result.passRequired} />
      ) : (
        <Gauge value={Math.abs(lc)} threshold={apcaThr} min={0} max={108} pass={apcaPass} />
      )}

      <div className="flex w-16 shrink-0 items-baseline justify-end gap-1">
        <span className="coord text-[9px] uppercase text-ink-3">{wcag ? '' : 'Lc'}</span>
        <span className="coord text-[13px] font-semibold text-zinc-900 tnum">
          {wcag ? result.ratio.toFixed(2) : Math.round(lc)}
        </span>
      </div>

      <div className="hidden w-14 shrink-0 text-right sm:block">
        {wcag ? (
          <>
            <span className="coord text-[10px] text-emerald-700 tnum">
              +{(result.ratio - rule.min).toFixed(2)}
            </span>
            <span className="coord ml-1 text-[10px] text-ink-3">≥{rule.min.toFixed(1)}</span>
          </>
        ) : (
          <span className="coord text-[10px] text-ink-3">≥{apcaThr}</span>
        )}
      </div>

      <div className="flex w-16 shrink-0 justify-end gap-1">
        {wcag ? (
          <>
            <Level label="AA" ok={result.passAA} />
            <Level label="AAA" ok={result.passAAA} />
          </>
        ) : (
          <span
            className={`coord inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              apcaPass ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {apcaPass ? (
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            ) : (
              <X className="h-2.5 w-2.5" strokeWidth={3} />
            )}
            Lc
          </span>
        )}
      </div>
    </div>
  );
}

export function AuditMatrix({ report, palette }: { report: VerifyReport; palette: Palette }) {
  const [method, setMethod] = useState<Method>('wcag');
  const total = report.results.length;

  const apca = useMemo(
    () =>
      report.results.map((r) => {
        const lc = apcaContrast(palette[r.rule.fg], palette[r.rule.bg]);
        return { pass: Math.abs(lc) >= apcaThreshold(r.rule.kind), abs: Math.abs(lc) };
      }),
    [report, palette],
  );

  const wcagPass = report.results.filter((r) => r.passRequired).length;
  const aaa = report.results.filter((r) => r.passAAA).length;
  const tightest = report.results.reduce((m, r) => Math.min(m, r.ratio - r.rule.min), Infinity);
  const apcaPass = apca.filter((x) => x.pass).length;
  const weakestLc = apca.reduce((m, x) => Math.min(m, x.abs), Infinity);

  const wcag = method === 'wcag';
  const passCount = wcag ? wcagPass : apcaPass;
  const allPass = passCount === total;

  return (
    <div className="space-y-4">
      {/* inspection certificate */}
      <div className="bracket flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-black/8 bg-[color:var(--color-panel)] px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              allPass ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {allPass ? (
              <BadgeCheck className="h-6 w-6" strokeWidth={2} />
            ) : (
              <TriangleAlert className="h-6 w-6" strokeWidth={2} />
            )}
          </span>
          <div>
            <div className="text-[15px] font-semibold text-zinc-900">
              {wcag
                ? allPass
                  ? 'Guaranteed accessible'
                  : `${total - wcagPass} rules unresolved`
                : allPass
                  ? 'Meets APCA targets'
                  : `${total - apcaPass} below APCA target`}
            </div>
            <div className="coord text-[11px] uppercase tracking-[0.1em] text-ink-3">
              {total} contrast rules · {wcag ? 'WCAG 2.1 AA' : 'APCA · WCAG 3 draft'}
            </div>
          </div>
        </div>

        <div className="flex items-stretch gap-6">
          <Stat value={`${passCount}/${total}`} label={wcag ? 'meet required' : 'meet target'} />
          <span className="w-px bg-black/8" />
          {wcag ? (
            <>
              <Stat value={`${aaa}/${total}`} label="also AAA" muted />
              <span className="w-px bg-black/8" />
              <Stat
                value={`+${Number.isFinite(tightest) ? tightest.toFixed(2) : '—'}`}
                label="tightest margin"
                muted
              />
            </>
          ) : (
            <Stat
              value={`${Number.isFinite(weakestLc) ? Math.round(weakestLc) : '—'}`}
              label="weakest Lc"
              muted
            />
          )}
        </div>

        <div className="ml-auto">
          <Segmented
            options={[
              { value: 'wcag', label: 'WCAG 2.1' },
              { value: 'apca', label: 'APCA' },
            ]}
            value={method}
            onChange={setMethod}
            size="sm"
          />
        </div>
      </div>

      {!wcag && (
        <p className="max-w-3xl px-1 text-[12px] leading-relaxed text-ink-2">
          <span className="coord mr-1.5 inline-block rounded bg-zinc-900 px-1.5 py-0.5 align-[1px] text-[9px] font-semibold uppercase text-white">
            2nd lens
          </span>
          APCA is perceptual and polarity-aware. The engine still{' '}
          <span className="font-medium text-zinc-700">guarantees WCAG 2.1</span> — it repairs to
          ratios, not to Lc — so the two methods won&apos;t always agree. Targets: Lc 75 body · 60
          large · 45 non-text.
        </p>
      )}

      {/* grouped inspection */}
      <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
        {GROUPS.map((group, gi) => {
          const rows = report.results.filter((r) => group.fg.includes(r.rule.fg));
          if (rows.length === 0) return null;
          return (
            <div key={group.label} style={{ borderTop: gi > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <div className="flex items-baseline gap-2 bg-zinc-50/60 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-2">
                  {group.label}
                </span>
                <span className="coord text-[9px] text-ink-3">{group.hint}</span>
                <span className="coord ml-auto text-[10px] text-ink-3">{rows.length} checks</span>
              </div>
              <div className="divide-y divide-black/5 px-3 pb-1">
                {rows.map((r, i) => (
                  <Row key={i} result={r} palette={palette} method={method} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ value, label, muted }: { value: string; label: string; muted?: boolean }) {
  return (
    <div>
      <div className={`coord text-[20px] font-semibold tnum ${muted ? 'text-ink-2' : 'text-zinc-900'}`}>
        {value}
      </div>
      <div className="coord text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
    </div>
  );
}
