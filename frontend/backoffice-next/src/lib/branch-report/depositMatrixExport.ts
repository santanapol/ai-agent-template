import { downloadCsv } from "@/components/data-table";
import type { DepositMatrixData } from "@/types/branchReport";

import { formatMatrixCount, formatMatrixPercent } from "./depositMatrixFormatters";

export type DepositMatrixExportMode = "count" | "percent";

/** Builds export-ready header/row strings matching what DepositMatrixTable renders on screen. */
export function buildDepositMatrixExportRows(
  data: DepositMatrixData,
  mode: DepositMatrixExportMode,
): { headers: string[]; rows: string[][] } {
  const formatCell = mode === "count" ? formatMatrixCount : formatMatrixPercent;
  const values = mode === "count" ? data.counts : data.percents;
  const rowTotals = mode === "count" ? data.rowSums : data.percentRowSums;
  const rounds = Array.from({ length: data.rounds }, (_, index) => index + 1);

  const headers = ["Rank", ...rounds.map(String), "SUM"];
  const rows = data.buckets.map((bucket, rowIndex) => [
    bucket.label,
    ...rounds.map((round) => formatCell(values[rowIndex]?.[round - 1] ?? 0)),
    formatCell(rowTotals[rowIndex] ?? 0),
  ]);

  return { headers, rows };
}

export function exportDepositMatrixToCsv(data: DepositMatrixData, mode: DepositMatrixExportMode, fileName: string) {
  const { headers, rows } = buildDepositMatrixExportRows(data, mode);
  downloadCsv(headers, rows, fileName);
}

export async function exportDepositMatrixToXlsx(
  data: DepositMatrixData,
  mode: DepositMatrixExportMode,
  fileName: string,
) {
  const { headers, rows } = buildDepositMatrixExportRows(data, mode);
  const { downloadXlsx } = await import("@/components/data-table/export-visible-rows-xlsx");
  downloadXlsx(headers, rows, fileName, mode === "count" ? "Deposit Count" : "Deposit Percent");
}
