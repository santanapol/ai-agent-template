import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
}

interface DescriptionListProps {
  title?: string;
  description?: string;
  items: DescriptionItem[];
  className?: string;
}

export function DescriptionList({ title, description, items, className }: DescriptionListProps) {
  return (
    <div className={className}>
      {title || description ? (
        <CardHeader className="px-0 pt-0">
          {title ? <CardTitle className="text-base">{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <dl
        className={cn(
          'grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2',
          title || description ? 'mt-4' : undefined
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className={cn('bg-card p-4', item.span === 2 && 'sm:col-span-2')}
          >
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-sm font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
