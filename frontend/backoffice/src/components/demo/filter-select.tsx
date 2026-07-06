import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  id?: string;
  placeholder: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  options: FilterOption[];
  className?: string;
  width?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function FilterSelect({
  id,
  placeholder,
  value,
  onChange,
  options,
  className,
  width = 'w-[180px]',
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: FilterSelectProps) {
  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(next) => onChange(next == null || next === 'all' ? undefined : next)}
    >
      <SelectTrigger
        id={id}
        className={cn(width, className)}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">All</SelectItem>
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
