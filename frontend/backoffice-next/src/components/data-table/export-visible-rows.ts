import type { Table } from "@tanstack/react-table";

import { triggerBlobDownload } from "@/lib/downloadBlob";

function cellToExportValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportVisibleRowsToCsv<TData>(table: Table<TData>, fileName: string) {
  const visibleColumns = table.getVisibleLeafColumns().filter((column) => column.id !== "select");
  const headers = visibleColumns.map((column) => {
    const header = column.columnDef.header;
    if (typeof header === "string") return header;
    return column.id;
  });

  const rows = table.getRowModel().rows.map((row) =>
    visibleColumns.map((column) => {
      const value = row.getValue(column.id);
      return cellToExportValue(value);
    }),
  );

  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerBlobDownload(blob, `${fileName}.csv`);
}
