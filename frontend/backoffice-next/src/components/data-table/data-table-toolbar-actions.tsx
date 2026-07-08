import type { ReactNode } from "react";

import type { Table } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DataTableColumnVisibility } from "./data-table-column-visibility";
import { exportVisibleRowsToCsv } from "./export-visible-rows";

interface DataTableToolbarActionsProps<TData> {
  table: Table<TData>;
  exportFileName?: string;
  extra?: ReactNode;
}

export function DataTableToolbarActions<TData>({
  table,
  exportFileName = "export",
  extra,
}: DataTableToolbarActionsProps<TData>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DataTableColumnVisibility table={table} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Export visible rows"
        onClick={() => exportVisibleRowsToCsv(table, exportFileName)}
      >
        <Download aria-hidden="true" />
        Export
      </Button>
      {extra}
    </div>
  );
}
