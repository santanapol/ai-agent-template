import { type FilterOption, FilterSelect } from "@/components/FilterSelect";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface FilterSelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  options: FilterOption[];
  includeAllOption?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  onOpen?: () => void;
  serverSearch?: boolean;
  onSearchQueryChange?: (query: string) => void;
  className?: string;
  width?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function FilterSelectField({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  includeAllOption,
  searchable,
  searchPlaceholder,
  emptyMessage,
  loading,
  onOpen,
  serverSearch,
  onSearchQueryChange,
  className,
  width,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: FilterSelectFieldProps) {
  return (
    <Field className={cn(width ?? "w-[200px]", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FilterSelect
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        options={options}
        includeAllOption={includeAllOption}
        width="w-full"
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
        loading={loading}
        onOpen={onOpen}
        serverSearch={serverSearch}
        onSearchQueryChange={onSearchQueryChange}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
    </Field>
  );
}
