import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PageContentCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: string;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function PageContentCard({
  children,
  title,
  description,
  extra,
  footer,
  className,
}: PageContentCardProps) {
  const hasHeader = Boolean(title || description || extra);

  return (
    <Card className={cn('shadow-sm', className)}>
      {hasHeader ? (
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            {title ? (
              typeof title === 'string' ? (
                <CardTitle className="text-base">{title}</CardTitle>
              ) : (
                title
              )
            ) : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {extra}
        </CardHeader>
      ) : null}
      <CardContent className={hasHeader ? undefined : 'pt-6'}>{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
