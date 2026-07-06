import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DetailContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onBack?: () => void;
  extra?: React.ReactNode;
  status?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
}

export function DetailContainer({
  title,
  description,
  onBack,
  extra,
  status,
  children,
  maxWidth = 1000,
  className,
}: DetailContainerProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-full flex-col gap-6', className)} style={{ maxWidth }}>
      <div className="flex flex-col gap-2">
        {onBack ? (
          <Button variant="link" className="h-auto w-fit px-0" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {typeof title === 'string' ? (
                <h1 className="text-2xl font-semibold text-balance">{title}</h1>
              ) : (
                title
              )}
              {status}
            </div>
            {description ? (
              <p className="text-sm text-pretty text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
