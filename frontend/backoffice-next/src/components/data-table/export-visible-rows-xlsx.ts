import type { Table } from "@tanstack/react-table";
import * as XLSX from "xlsx";

import { triggerBlobDownload } from "@/lib/downloadBlob";

import { getTableExportData } from "./export-visible-rows";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function downloadXlsx(headers: string[], rows: string[][], fileName: string, sheetName = "Export") {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  triggerBlobDownload(new Blob([buffer], { type: XLSX_MIME }), `${fileName}.xlsx`);
}

export function exportVisibleRowsToXlsx<TData>(table: Table<TData>, fileName: string) {
  const { headers, rows } = getTableExportData(table);
  downloadXlsx(headers, rows, fileName);
}
