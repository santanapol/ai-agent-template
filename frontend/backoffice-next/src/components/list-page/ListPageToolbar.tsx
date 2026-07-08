import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListPageToolbarProps {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ListPageToolbar({ search, filters, actions, className }: ListPageToolbarProps) {
  return (
    <div className={cn("flex w-full flex-wrap items-center gap-2", className)}>
      {search}
      {filters}
      {actions != null ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
