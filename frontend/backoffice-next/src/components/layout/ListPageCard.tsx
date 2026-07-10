import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ListPageCardProps {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  filterRow?: ReactNode;
  selectionBar?: ReactNode;
  headerAddon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ListPageCard({
  title,
  description,
  toolbar,
  filterRow,
  selectionBar,
  headerAddon,
  footer,
  children,
  className,
}: ListPageCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">{title}</CardTitle>
        {description != null ? (
          <CardDescription className="max-w-sm leading-snug">{description}</CardDescription>
        ) : null}
        {toolbar != null ? (
          <CardAction className="col-start-1 row-start-auto flex w-full min-w-0 flex-wrap items-end justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:max-w-none md:flex-wrap md:justify-end md:justify-self-end">
            {toolbar}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        {headerAddon != null ? <div className="px-4">{headerAddon}</div> : null}
        {filterRow != null ? (
          <div className="flex flex-wrap items-center gap-3 px-4">{filterRow}</div>
        ) : null}
        {selectionBar}
        <div className="flex min-w-0 flex-col">
          {children}
          {footer != null ? <div className="border-t">{footer}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
