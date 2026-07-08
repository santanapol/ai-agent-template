import { Field, FieldLabel } from '@/components/ui/field';
import { FilterSelect, type FilterOption } from '@/components/demo/filter-select';
import { cn } from '@/lib/utils';

interface FilterSelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  options: FilterOption[];
  className?: string;
  width?: string;
}

export function FilterSelectField({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  className,
  width,
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
      />
    </Field>
  );
}
