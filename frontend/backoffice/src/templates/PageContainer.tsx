import { cn } from '@/lib/utils';

interface PageContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  extra,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          {typeof title === 'string' ? (
            <h1 className="text-2xl font-semibold text-balance">{title}</h1>
          ) : (
            title
          )}
          {description ? (
            <p className="text-sm text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}
