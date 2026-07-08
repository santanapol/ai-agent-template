"use client";

import {
  type ColumnDef,
  getCoreRowModel,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

interface UseServerDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  onPaginationChange: (pagination: PaginationState) => void;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  getRowId?: (row: TData, index: number) => string;
}

export function useServerDataTable<TData>({
  data,
  columns,
  pageIndex,
  pageSize,
  pageCount,
  onPaginationChange,
  columnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
  enableRowSelection,
  getRowId,
}: UseServerDataTableOptions<TData>) {
  return useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex, pageSize },
      columnVisibility,
      rowSelection: rowSelection ?? {},
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      onPaginationChange(next);
    },
    onColumnVisibilityChange,
    onRowSelectionChange,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    getRowId,
  });
}
