"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface InlineFilterOption {
  value: string;
  label: string;
}

interface InlineFilterSelectProps {
  id: string;
  /** Inline prefix shown before the value (e.g. "Status:"). Omit when an external <FieldLabel htmlFor> already labels this field. */
  prefix?: string;
  value: string;
  options: InlineFilterOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function InlineFilterSelect({
  id,
  prefix,
  value,
  options,
  onChange,
  className,
  disabled = false,
}: InlineFilterSelectProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  const displayValue = prefix ? `${prefix} ${selectedLabel}` : selectedLabel;

  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)} disabled={disabled}>
      <SelectTrigger
        id={id}
        size="sm"
        aria-label={prefix ? displayValue : undefined}
        className={cn("w-fit", className)}
      >
        <SelectValue>{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
