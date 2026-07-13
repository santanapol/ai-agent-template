import { Fragment } from "react";

import { ArrowLeft } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@/navigation/compat";

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
  /** Omit or pass `null` for full content width (no max-width clamp). */
  maxWidth?: number | null;
  stickyChrome?: boolean;
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
  stickyChrome = false,
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

  let backControl: React.ReactNode = null;
  if (backUrl) {
    backControl = (
      <Link to={backUrl} className={cn(buttonVariants({ variant: "link" }), "h-auto w-fit px-0")}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Back
      </Link>
    );
  } else if (onBack) {
    backControl = (
      <Button variant="link" className="h-auto w-fit px-0" onClick={handleBack}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Back
      </Button>
    );
  }

  return (
    <div
      className={cn("mx-auto flex w-full min-w-0 max-w-full flex-col gap-6", className)}
      style={maxWidth == null ? undefined : { maxWidth }}
    >
      {breadcrumbItems && breadcrumbItems.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              return (
                <Fragment key={String(item.title)}>
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
      <div
        className={cn(
          "flex flex-col gap-2",
          stickyChrome &&
            "sticky top-0 z-10 -mx-1 border-border/60 border-b bg-background/95 px-1 pb-3 backdrop-blur-sm supports-backdrop-filter:bg-background/80",
        )}
      >
        {backControl}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {typeof title === "string" ? <h1 className="text-balance font-semibold text-2xl">{title}</h1> : title}
              {status}
            </div>
            {description ? <p className="text-pretty text-muted-foreground text-sm">{description}</p> : null}
          </div>
          {extra ? <div className="flex items-center gap-2">{extra}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
