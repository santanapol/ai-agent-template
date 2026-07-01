import { Fragment } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbEntry {
  title: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

interface DetailContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onBack?: () => void;
  backUrl?: string;
  breadcrumbItems?: BreadcrumbEntry[];
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
  backUrl,
  breadcrumbItems,
  extra,
  status,
  children,
  maxWidth = 1000,
  className,
}: DetailContainerProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    }
  };

  return (
    <div className={cn('mx-auto flex w-full max-w-full flex-col gap-6', className)} style={{ maxWidth }}>
      {breadcrumbItems && breadcrumbItems.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              return (
                <Fragment key={index}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.title}</BreadcrumbPage>
                    ) : item.onClick || item.href ? (
                      <BreadcrumbLink
                        href={item.href}
                        onClick={(e) => {
                          if (item.onClick) {
                            e.preventDefault();
                            item.onClick();
                          }
                        }}
                      >
                        {item.title}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.title}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}
      <div className="flex flex-col gap-2">
        {(onBack || backUrl) ? (
          <Button variant="link" className="h-auto w-fit px-0" onClick={handleBack}>
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
