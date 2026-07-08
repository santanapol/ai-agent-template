"use client";

import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";

interface UseClientDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  initialPageSize?: number;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData, index: number) => string;
}

export function useClientDataTable<TData>({
  data,
  columns,
  initialPageSize = 10,
  columnVisibility,
  onColumnVisibilityChange,
  rowSelection,
  onRowSelectionChange,
  getRowId,
}: UseClientDataTableOptions<TData>) {
  return useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      rowSelection: rowSelection ?? {},
    },
    initialState: {
      pagination: { pageIndex: 0, pageSize: initialPageSize },
    },
    onColumnVisibilityChange,
    onRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
  });
}
