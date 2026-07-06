import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface BreadcrumbEntry {
  title: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

interface PageContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  breadcrumbItems?: BreadcrumbEntry[];
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  description,
  extra,
  breadcrumbItems,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
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
