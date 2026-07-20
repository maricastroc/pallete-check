'use client';

import * as RSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SelectOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <RSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <RSelect.Trigger
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-1 rounded-md text-[14px] capitalize text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-black/15 data-[state=open]:text-zinc-900"
      >
        <RSelect.Value />
        <RSelect.Icon>
          <ChevronDown className="h-4 w-4 text-ink-3" />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={8}
          align="end"
          className="z-50 min-w-[--radix-select-trigger-width] overflow-hidden rounded-xl border border-black/8 bg-white p-1 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.28)]"
        >
          <RSelect.Viewport>
            {options.map((opt) => (
              <RSelect.Item
                key={opt.value}
                value={opt.value}
                className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-[14px] capitalize text-ink-2 outline-none data-[highlighted]:bg-black/[0.05] data-[highlighted]:text-zinc-900 data-[state=checked]:text-zinc-900"
              >
                <RSelect.ItemText>{opt.label}</RSelect.ItemText>
                <RSelect.ItemIndicator>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
