'use client';

import { Loader2, Sparkles } from 'lucide-react';
import type { HarmonyScheme } from '@/lib/color';
import { Select, type SelectOption } from '@/components/ui/Select';

const SCHEME_OPTIONS: SelectOption<HarmonyScheme>[] = [
  { value: 'analogous', label: 'Analogous' },
  { value: 'complementary', label: 'Complementary' },
  { value: 'triadic', label: 'Triadic' },
  { value: 'monochromatic', label: 'Monochromatic' },
];

export interface FormState {
  productType: string;
  vibe: string;
  scheme: HarmonyScheme;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
      {children}
    </span>
  );
}

export function PromptBar({
  value,
  loading,
  onChange,
  onSubmit,
}: {
  value: FormState;
  loading: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
}) {
  const canSubmit = value.productType.trim().length > 0 && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="flex flex-col gap-2 rounded-2xl border border-black/8 bg-white p-2 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.28)] sm:flex-row sm:items-center sm:gap-0 sm:p-1.5"
    >
      <div className="min-w-0 flex-2 px-3 py-1.5">
        <FieldLabel>Product</FieldLabel>
        <input
          value={value.productType}
          onChange={(e) => onChange({ productType: e.target.value })}
          placeholder="dashboard for a modern fintech"
          className="w-full bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-ink-3"
        />
      </div>

      <span className="hidden h-9 w-px bg-black/8 sm:block" />

      <div className="min-w-0 flex-1 px-3 py-1.5">
        <FieldLabel>Vibe</FieldLabel>
        <input
          value={value.vibe}
          onChange={(e) => onChange({ vibe: e.target.value })}
          placeholder="premium, calm"
          className="w-full bg-transparent text-[14px] text-zinc-900 outline-none placeholder:text-ink-3"
        />
      </div>

      <span className="hidden h-9 w-px bg-black/8 sm:block" />

      <div className="min-w-0 px-3 py-1.5 sm:w-40">
        <FieldLabel>Harmony</FieldLabel>
        <Select
          ariaLabel="Harmony scheme"
          options={SCHEME_OPTIONS}
          value={value.scheme}
          onChange={(scheme) => onChange({ scheme })}
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="group flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-300 sm:py-2.5"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
        )}
        {loading ? 'Generating' : 'Generate'}
      </button>
    </form>
  );
}
