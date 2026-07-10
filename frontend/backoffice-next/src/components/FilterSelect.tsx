import { useEffect, useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

const ALL_OPTION: FilterOption = { value: "all", label: "All" };

interface FilterSelectProps {
  id?: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  options: FilterOption[];
  className?: string;
  width?: string;
  /** When true (default), prepends an "All" option for clearing the filter. */
  includeAllOption?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  disabled?: boolean;
}

export function FilterSelect({
  id,
  placeholder,
  value,
  onChange,
  options,
  className,
  width = "w-[180px]",
  includeAllOption = true,
  searchable = false,
  searchPlaceholder = "Search…",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  disabled = false,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery, searchable]);

  const items = useMemo(
    () => (includeAllOption ? [ALL_OPTION, ...filteredOptions] : filteredOptions),
    [filteredOptions, includeAllOption],
  );

  const selectValue = includeAllOption ? (value ?? "all") : (value ?? null);

  useEffect(() => {
    if (!searchable || !open) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(searchInputId)?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, searchable, searchInputId]);

  const searchHeader = searchable ? (
    <div
      className="sticky top-0 z-10 border-b bg-popover p-2"
      onPointerDown={(event) => event.preventDefault()}
    >
      <Input
        id={searchInputId}
        type="search"
        aria-label={`${placeholder} search`}
        placeholder={searchPlaceholder}
        value={searchQuery}
        autoComplete="off"
        onChange={(event) => setSearchQuery(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
      />
    </div>
  ) : undefined;

  return (
    <Select
      open={searchable ? open : undefined}
      onOpenChange={
        searchable
          ? (nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) setSearchQuery("");
            }
          : undefined
      }
      value={selectValue}
      items={items}
      onValueChange={(next) => {
        if (includeAllOption) {
          onChange(next == null || next === "all" ? undefined : next);
          return;
        }
        onChange(next == null ? undefined : next);
      }}
    >
      <SelectTrigger
        id={id}
        className={cn(width, className)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className={searchable ? "max-h-80" : undefined}
        alignItemWithTrigger={!searchable}
        header={searchHeader}
      >
        <SelectGroup>
          {items.length > 0 ? (
            items.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-muted-foreground text-sm" role="status">
              No branches found
            </div>
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
