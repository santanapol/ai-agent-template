import { Field, FieldLabel } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

interface DateFilterFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateFilterField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
}: DateFilterFieldProps) {
  return (
    <Field className={cn('w-[200px]', className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DatePicker
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </Field>
  );
}
