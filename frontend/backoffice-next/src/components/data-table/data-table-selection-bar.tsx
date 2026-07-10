import type { Table } from "@tanstack/react-table";

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
}

export function DataTableSelectionBar<TData>({ table }: DataTableSelectionBarProps<TData>) {
  const selectedCount = Object.keys(table.getState().rowSelection ?? {}).length;

  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-muted-foreground text-sm">
      <span>{selectedCount} selected</span>
    </div>
  );
}
