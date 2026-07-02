import { Field, FieldLabel } from '@/components/ui/field';
import { FilterSelect, type FilterOption } from '@/components/filter-select';
import { cn } from '@/lib/utils';

interface FilterSelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  options: FilterOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  width?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function FilterSelectField({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  searchable,
  searchPlaceholder,
  className,
  width,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: FilterSelectFieldProps) {
  return (
    <Field className={cn(width ?? 'w-[200px]', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FilterSelect
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        options={options}
        width="w-full"
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
    </Field>
  );
}
