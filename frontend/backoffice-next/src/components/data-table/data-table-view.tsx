"use no memo";

import type { RowSelectionState, Table } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, Table as UiTable } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableViewProps<TData> {
  table: Table<TData>;
  /** Pass controlled selection so the view re-renders when `table` identity is stable. */
  rowSelection?: RowSelectionState;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  emptyIcon?: LucideIcon;
  className?: string;
}

export function DataTableView<TData>({
  table,
  rowSelection,
  loading = false,
  emptyTitle = "No data found",
  emptyDescription = "Try adjusting your filters.",
  emptyAction,
  emptyIcon: EmptyIcon,
  className,
}: DataTableViewProps<TData>) {
  // Prefer explicit prop; fall back to table state for uncontrolled callers.
  void (rowSelection ?? table.getState().rowSelection);

  const columnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2 px-4", className)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <UiTable className="**:data-[slot=table-cell]:px-4 **:data-[slot=table-head]:px-4">
        <TableHeader className="[&_tr]:border-t">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const align = (header.column.columnDef.meta as { align?: "left" | "right" } | undefined)?.align;
                return (
                  <TableHead key={header.id} className={cn("py-3 font-normal", align === "right" && "text-right")}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                {row.getVisibleCells().map((cell) => {
                  const align = (cell.column.columnDef.meta as { align?: "left" | "right" } | undefined)?.align;
                  return (
                    <TableCell key={cell.id} className={cn("py-3 align-middle", align === "right" && "text-right")}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-32 p-0">
                <Empty>
                  <EmptyHeader>
                    {EmptyIcon ? (
                      <EmptyMedia variant="icon">
                        <EmptyIcon aria-hidden="true" />
                      </EmptyMedia>
                    ) : null}
                    <EmptyTitle>{emptyTitle}</EmptyTitle>
                    <EmptyDescription>{emptyDescription}</EmptyDescription>
                  </EmptyHeader>
                  {emptyAction ? (
                    <EmptyContent>
                      <Button type="button" variant="outline" onClick={emptyAction.onClick}>
                        {emptyAction.label}
                      </Button>
                    </EmptyContent>
                  ) : null}
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </UiTable>
    </div>
  );
}
