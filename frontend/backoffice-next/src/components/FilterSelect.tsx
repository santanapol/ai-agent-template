import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  emptyMessage?: string;
  loading?: boolean;
  onOpen?: () => void;
  /** When true with `searchable`, options are not filtered client-side; use `onSearchQueryChange`. */
  serverSearch?: boolean;
  onSearchQueryChange?: (query: string) => void;
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
  emptyMessage = "No options found",
  loading = false,
  onOpen,
  serverSearch = false,
  onSearchQueryChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  disabled = false,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputId = useId();
  const selectedLabelByValueRef = useRef(new Map<string, string>());

  const filteredOptions = useMemo(() => {
    if (!searchable || serverSearch || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery, searchable, serverSearch]);

  useEffect(() => {
    for (const option of options) {
      selectedLabelByValueRef.current.set(option.value, option.label);
    }
  }, [options]);

  const listOptions = useMemo(() => {
    if (!value || includeAllOption || value === "all") return filteredOptions;
    if (filteredOptions.some((option) => option.value === value)) return filteredOptions;
    const cachedLabel = selectedLabelByValueRef.current.get(value);
    if (cachedLabel) return [...filteredOptions, { value, label: cachedLabel }];
    return filteredOptions;
  }, [filteredOptions, includeAllOption, value]);

  const items = useMemo(
    () => (includeAllOption ? [ALL_OPTION, ...listOptions] : listOptions),
    [listOptions, includeAllOption],
  );

  const selectValue = includeAllOption ? (value ?? "all") : (value ?? null);

  useEffect(() => {
    if (!searchable || !open) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(searchInputId)?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open, searchable, searchInputId]);

  const searchHeader = searchable ? (
    <div className="sticky top-0 z-10 border-b bg-popover p-2" onPointerDown={(event) => event.preventDefault()}>
      <Input
        id={searchInputId}
        type="search"
        aria-label={`${placeholder} search`}
        placeholder={searchPlaceholder}
        value={searchQuery}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          setSearchQuery(next);
          if (serverSearch) onSearchQueryChange?.(next);
        }}
        onKeyDown={(event) => event.stopPropagation()}
      />
    </div>
  ) : undefined;

  const handleOpenChange = (nextOpen: boolean) => {
    if (searchable) {
      setOpen(nextOpen);
      if (!nextOpen) {
        const hadSearch = searchQuery.trim().length > 0;
        setSearchQuery("");
        if (serverSearch && hadSearch) onSearchQueryChange?.("");
      }
    }
    if (nextOpen) onOpen?.();
  };

  const handleValueChange = (next: string | null) => {
    let nextValue: string | undefined;
    if (includeAllOption) {
      nextValue = next == null || next === "all" ? undefined : next;
    } else {
      nextValue = next ?? undefined;
    }
    if (nextValue) {
      const label = options.find((option) => option.value === nextValue)?.label;
      if (label) selectedLabelByValueRef.current.set(nextValue, label);
    }
    onChange(nextValue);
  };

  let optionsContent: React.ReactNode;
  if (loading && listOptions.length === 0) {
    optionsContent = (
      <div className="px-2 py-1.5 text-muted-foreground text-sm" role="status">
        Loading…
      </div>
    );
  } else if (listOptions.length > 0) {
    optionsContent = (
      <>
        {loading ? (
          <div className="px-2 py-1.5 text-muted-foreground text-sm" role="status">
            Loading…
          </div>
        ) : null}
        {listOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </>
    );
  } else {
    optionsContent = (
      <div className="px-2 py-1.5 text-muted-foreground text-sm" role="status">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Select
      open={searchable ? open : undefined}
      onOpenChange={onOpen || searchable ? handleOpenChange : undefined}
      value={selectValue}
      items={items}
      onValueChange={handleValueChange}
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
        <SelectGroup>{optionsContent}</SelectGroup>
      </SelectContent>
    </Select>
  );
}
