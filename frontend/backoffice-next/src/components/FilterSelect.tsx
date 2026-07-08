import { useMemo, useState } from "react";

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
  searchable = false,
  searchPlaceholder = "Search…",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  disabled = false,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const query = searchQuery.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery, searchable]);

  const items = useMemo(() => [ALL_OPTION, ...filteredOptions], [filteredOptions]);

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
      value={value ?? "all"}
      items={items}
      onValueChange={(next) => onChange(next == null || next === "all" ? undefined : next)}
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
      <SelectContent className={searchable ? "max-h-80" : undefined}>
        {searchable ? (
          <div className="sticky top-0 z-10 border-b bg-popover p-2" onPointerDown={(event) => event.stopPropagation()}>
            <Input
              aria-label={`${placeholder} search`}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
        <SelectGroup>
          {items.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
