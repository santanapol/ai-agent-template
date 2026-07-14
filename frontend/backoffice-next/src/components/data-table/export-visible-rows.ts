import type { Table } from "@tanstack/react-table";

import { triggerBlobDownload } from "@/lib/downloadBlob";

function cellToExportValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

// Cells starting with these characters are auto-executed as formulas by
// Excel/Sheets when the CSV is opened ("CSV injection") - guard with a
// leading apostrophe so they're read back as literal text.
const FORMULA_INJECTION_PREFIX_RE = /^[=+\-@\t\r]/;

function escapeCsvCell(value: string): string {
  const guarded = FORMULA_INJECTION_PREFIX_RE.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** Extracts visible-column headers and row values from a table, as export-ready strings. */
export function getTableExportData<TData>(table: Table<TData>): { headers: string[]; rows: string[][] } {
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

  return { headers, rows };
}

export function toCsvString(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function downloadCsv(headers: string[], rows: string[][], fileName: string) {
  const blob = new Blob([toCsvString(headers, rows)], { type: "text/csv;charset=utf-8" });
  triggerBlobDownload(blob, `${fileName}.csv`);
}

export function exportVisibleRowsToCsv<TData>(table: Table<TData>, fileName: string) {
  const { headers, rows } = getTableExportData(table);
  downloadCsv(headers, rows, fileName);
}
