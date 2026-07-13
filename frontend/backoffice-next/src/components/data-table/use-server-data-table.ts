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

/**
 * Server-paginated table: `data` is already the current page from the API.
 * Pagination chrome uses `pageCount`; rows render from core row model only
 * (no client-side slice — matches legacy DataTable server mode).
 */
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
  "use no memo";

  return useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
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
    getRowId,
  });
}
