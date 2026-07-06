import { FieldGroup } from '@/components/ui/field';
import { cn } from '@/lib/utils';

interface FiltersContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function FiltersContainer({ children, className }: FiltersContainerProps) {
  return (
    <FieldGroup
      className={cn(
        'mb-4 flex flex-row flex-wrap items-end gap-4 *:data-[slot=field]:w-auto',
        className
      )}
    >
      {children}
    </FieldGroup>
  );
}
