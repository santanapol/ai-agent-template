import { Field, FieldLabel } from '@/components/ui/field';
import { MonthPicker } from '@/components/ui/month-picker';
import { cn } from '@/lib/utils';

interface MonthFilterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MonthFilterField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: MonthFilterFieldProps) {
  return (
    <Field className={cn('w-[220px]', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <MonthPicker
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </Field>
  );
}
