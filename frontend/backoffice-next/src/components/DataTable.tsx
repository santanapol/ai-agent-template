import { useEffect, useMemo } from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  title: React.ReactNode;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
  accessor?: keyof T;
}

export interface ServerPaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onChange: (page: number, pageSize: number) => void;
  showTotal?: (total: number) => React.ReactNode;
}

export interface RowSelectionConfig<T> {
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  getRowDisabled?: (row: T) => boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey: keyof T | ((row: T) => string | number);
  pageSize?: number;
  className?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: ServerPaginationConfig;
  rowSelection?: RowSelectionConfig<T>;
  footer?: React.ReactNode;
}

function toColumnDefs<T>(columns: DataTableColumn<T>[]): ColumnDef<T>[] {
  return columns.map((col) => ({
    id: col.key,
    accessorKey: col.accessor ? String(col.accessor) : undefined,
    header: () => col.title,
    cell: ({ row }) => {
      if (col.render) return col.render(row.original);
      if (col.accessor) return String(row.original[col.accessor] ?? "-");
      return "-";
    },
    meta: { align: col.align },
  }));
}

function getRowIdValue<T>(row: T, rowKey: keyof T | ((row: T) => string | number), index: number): string {
  if (typeof rowKey === "function") return String(rowKey(row));
  const value = row[rowKey];
  return value != null ? String(value) : String(index);
}

function skeletonHeaderWidthClass(index: number, total: number): string {
  if (index === 0) return "max-w-24";
  if (index === total - 1) return "max-w-20";
  return "w-full";
}

function skeletonCellWidthClass(cellIndex: number, hasRowSelection: boolean): string {
  if (hasRowSelection && cellIndex === 0) return "size-4 rounded-full";
  if (cellIndex === 0) return "max-w-28";
  return "w-full";
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  pageSize = 5,
  className,
  emptyAction,
  emptyTitle = "No data found",
  emptyDescription = "Try adjusting your filters.",
  pagination,
  rowSelection,
  footer,
}: DataTableProps<T>) {
  const columnDefs = useMemo(() => toColumnDefs(columns), [columns]);
  const isServerPagination = Boolean(pagination);

  const table = useReactTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    initialState: {
      // biome-ignore lint/suspicious/noUnnecessaryConditions: pagination is an optional prop - the fallback runs whenever server pagination isn't configured.
      pagination: { pageSize: pagination?.pageSize ?? pageSize },
    },
    getRowId: (row, index) => getRowIdValue(row, rowKey, index),
  });

  useEffect(() => {
    if (!isServerPagination) {
      table.setPageIndex(0);
    }
  }, [table, isServerPagination]);

  useEffect(() => {
    if (!isServerPagination) {
      table.setPageSize(pageSize);
    }
  }, [pageSize, table, isServerPagination]);

  const toggleRow = (id: string, row: T) => {
    if (!rowSelection) return;
    if (rowSelection.getRowDisabled?.(row)) return;
    const { selectedKeys, onChange } = rowSelection;
    if (selectedKeys.includes(id)) {
      onChange(selectedKeys.filter((k) => k !== id));
    } else {
      onChange([...selectedKeys, id]);
    }
  };

  const selectableIds = useMemo(
    () =>
      rowSelection
        ? data
            .filter((row) => !rowSelection.getRowDisabled?.(row))
            .map((row, rowIndex) => getRowIdValue(row, rowKey, rowIndex))
        : [],
    [data, rowKey, rowSelection],
  );

  const toggleAll = () => {
    if (!rowSelection) return;
    const allSelected = selectableIds.every((id) => rowSelection.selectedKeys.includes(id));
    if (allSelected) {
      rowSelection.onChange(rowSelection.selectedKeys.filter((id) => !selectableIds.includes(id)));
    } else {
      const merged = new Set([...rowSelection.selectedKeys, ...selectableIds]);
      rowSelection.onChange([...merged]);
    }
  };
  const skeletonColumns = Math.max(columnDefs.length + (rowSelection ? 1 : 0), 3);

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4", className)} aria-busy="true">
        <div className="overflow-hidden rounded-lg border">
          <div
            className="grid gap-3 border-b bg-muted/40 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${skeletonColumns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: skeletonColumns }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder count, never reorders or filters.
              <Skeleton key={index} className={cn("h-4", skeletonHeaderWidthClass(index, skeletonColumns))} />
            ))}
          </div>
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder count, never reorders or filters.
                key={rowIndex}
                className="grid gap-3 border-b px-4 py-3 last:border-0"
                style={{ gridTemplateColumns: `repeat(${skeletonColumns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: skeletonColumns }).map((__, cellIndex) => (
                  <Skeleton
                    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder count, never reorders or filters.
                    key={cellIndex}
                    className={cn("h-4", skeletonCellWidthClass(cellIndex, Boolean(rowSelection)))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? (
          <EmptyContent>
            <Button variant="outline" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const rows = table.getRowModel().rows;
  const serverTotalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const clientPageIndex = table.getState().pagination.pageIndex;
  const clientTotalPages = table.getPageCount();

  const allSelected =
    rowSelection && selectableIds.length > 0 && selectableIds.every((id) => rowSelection.selectedKeys.includes(id));
  const someSelected =
    rowSelection && selectableIds.some((id) => rowSelection.selectedKeys.includes(id)) && !allSelected;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {rowSelection ? (
                  <TableHead scope="col" className="w-10 px-2">
                    <Checkbox
                      checked={Boolean(allSelected)}
                      indeterminate={Boolean(someSelected)}
                      onCheckedChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </TableHead>
                ) : null}
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as { align?: "left" | "right" } | undefined)?.align;
                  return (
                    <TableHead key={header.id} scope="col" className={cn(align === "right" && "text-right")}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const rowId = row.id;
              const disabled = rowSelection?.getRowDisabled?.(row.original) ?? false;
              // biome-ignore lint/suspicious/noUnnecessaryConditions: rowSelection is an optional prop.
              const selected = rowSelection?.selectedKeys.includes(rowId) ?? false;
              return (
                <TableRow key={row.id} data-state={selected ? "selected" : undefined}>
                  {rowSelection ? (
                    <TableCell className="w-10 px-2">
                      <Checkbox
                        checked={selected}
                        disabled={disabled}
                        onCheckedChange={() => toggleRow(rowId, row.original)}
                        aria-label={`Select row ${rowId}`}
                      />
                    </TableCell>
                  ) : null}
                  {row.getVisibleCells().map((cell) => {
                    const align = (cell.column.columnDef.meta as { align?: "left" | "right" } | undefined)?.align;
                    return (
                      <TableCell key={cell.id} className={cn(align === "right" && "text-right tabular-nums")}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {footer}
          </TableBody>
        </Table>
      </div>

      {isServerPagination && pagination && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {pagination.showTotal ? (
            <span className="text-muted-foreground text-sm">{pagination.showTotal(pagination.total)}</span>
          ) : (
            <span className="text-muted-foreground text-sm">Total {pagination.total} items</span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {pagination.pageSizeOptions ? (
              <Select
                value={String(pagination.pageSize)}
                items={pagination.pageSizeOptions.map((size) => ({
                  value: String(size),
                  label: `${size} / page`,
                }))}
                onValueChange={(val) => pagination.onChange(1, Number(val))}
              >
                <SelectTrigger className="w-[100px]" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {pagination.pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} / page
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onChange(pagination.page - 1, pagination.pageSize)}
            >
              Previous
            </Button>
            <span className="text-pretty text-muted-foreground text-sm">
              Page {pagination.page} of {serverTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= serverTotalPages}
              onClick={() => pagination.onChange(pagination.page + 1, pagination.pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {!isServerPagination && clientTotalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <span className="text-pretty text-muted-foreground text-sm">
            Page {clientPageIndex + 1} of {clientTotalPages}
          </span>
          <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
