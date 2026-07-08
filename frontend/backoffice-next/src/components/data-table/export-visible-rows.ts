import type { Table } from "@tanstack/react-table";
import * as XLSX from "xlsx";

function cellToExportValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
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

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: "csv" });
}
