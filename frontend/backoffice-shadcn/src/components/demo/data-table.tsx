import { useEffect, useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  title: string;
  align?: 'left' | 'right';
  render?: (row: T) => React.ReactNode;
  accessor?: keyof T;
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
}

function toColumnDefs<T>(columns: DataTableColumn<T>[]): ColumnDef<T>[] {
  return columns.map((col) => ({
    id: col.key,
    accessorKey: col.accessor ? String(col.accessor) : undefined,
    header: col.title,
    cell: ({ row }) => {
      if (col.render) return col.render(row.original);
      if (col.accessor) return String(row.original[col.accessor] ?? '-');
      return '-';
    },
    meta: { align: col.align },
  }));
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  rowKey,
  pageSize = 5,
  className,
  emptyAction,
}: DataTableProps<T>) {
  const columnDefs = useMemo(() => toColumnDefs(columns), [columns]);

  const table = useReactTable({
    data,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
    getRowId: (row, index) => {
      if (typeof rowKey === 'function') return String(rowKey(row));
      const value = row[rowKey];
      return value != null ? String(value) : String(index);
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [data, table]);

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  if (loading) {
    return <Skeleton className={cn('h-48 w-full', className)} aria-busy="true" />;
  }

  if (!data.length) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyTitle>No data found</EmptyTitle>
          <EmptyDescription>Try adjusting your filters.</EmptyDescription>
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

  const { pageIndex } = table.getState().pagination;
  const totalPages = table.getPageCount();

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align = (header.column.columnDef.meta as { align?: 'left' | 'right' } | undefined)?.align;
                  return (
                    <TableHead
                      key={header.id}
                      scope="col"
                      className={cn(align === 'right' && 'text-right')}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const align = (cell.column.columnDef.meta as { align?: 'left' | 'right' } | undefined)?.align;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(align === 'right' && 'text-right tabular-nums')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-pretty text-muted-foreground">
            Page {pageIndex + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
