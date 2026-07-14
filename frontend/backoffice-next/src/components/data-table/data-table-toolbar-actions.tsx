import type { ReactNode } from "react";

import type { Table } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DataTableColumnVisibility } from "./data-table-column-visibility";
import { exportVisibleRowsToCsv } from "./export-visible-rows";

interface DataTableToolbarActionsProps<TData> {
  table: Table<TData>;
  exportFileName?: string;
  showColumnVisibility?: boolean;
  /** Disable the Export button (e.g. before a search has run or when there are no rows). */
  exportDisabled?: boolean;
  /** Override the default TanStack-table-driven CSV export (e.g. for a non-table data grid). */
  onExportCsv?: () => void;
  /** Override the default TanStack-table-driven Excel export (e.g. for a non-table data grid). */
  onExportXlsx?: () => void | Promise<void>;
  extra?: ReactNode;
}

export function DataTableToolbarActions<TData>({
  table,
  exportFileName = "export",
  showColumnVisibility = true,
  exportDisabled = false,
  onExportCsv,
  onExportXlsx,
  extra,
}: DataTableToolbarActionsProps<TData>) {
  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    exportVisibleRowsToCsv(table, exportFileName);
  };

  const handleExportXlsx = async () => {
    if (onExportXlsx) {
      await onExportXlsx();
      return;
    }
    const { exportVisibleRowsToXlsx } = await import("./export-visible-rows-xlsx");
    exportVisibleRowsToXlsx(table, exportFileName);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showColumnVisibility ? <DataTableColumnVisibility table={table} /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Export visible rows"
              disabled={exportDisabled}
            />
          }
        >
          <Download aria-hidden="true" />
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportCsv}>Export CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportXlsx}>Export Excel</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {extra}
    </div>
  );
}
