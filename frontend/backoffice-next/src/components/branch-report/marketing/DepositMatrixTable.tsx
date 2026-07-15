"use client";

import type React from "react";

import { formatMatrixCount, formatMatrixPercent } from "@/lib/branch-report/depositMatrixFormatters";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DepositMatrixData } from "@/types/branchReport";

export type DepositMatrixMode = "count" | "percent";

interface DepositMatrixTableProps {
  mode: DepositMatrixMode;
  data: DepositMatrixData | null;
  hasSearched: boolean;
  loading?: boolean;
}

// Ordered low → high; index doubles as the opacity step (0, 10, 20, ... 90).
const HEATMAP_BG_STEPS = [
  "",
  "bg-primary/10",
  "bg-primary/20",
  "bg-primary/30",
  "bg-primary/40",
  "bg-primary/50",
  "bg-primary/60",
  "bg-primary/70",
  "bg-primary/80",
  "bg-primary/90",
] as const;

function heatmapClassName(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "";
  const step = Math.min(
    HEATMAP_BG_STEPS.length - 1,
    Math.max(1, Math.round((value / max) * (HEATMAP_BG_STEPS.length - 1))),
  );
  return cn(HEATMAP_BG_STEPS[step], step >= 6 && "text-primary-foreground");
}

const DepositMatrixTable: React.FC<DepositMatrixTableProps> = ({
  mode,
  data,
  hasSearched,
  loading = false,
}) => {
  if (!hasSearched || !data) {
    return (
      <div className="py-10">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{hasSearched ? "No matrix data" : "Run Search to load report"}</EmptyTitle>
            <EmptyDescription>
              {hasSearched
                ? "Search returned no deposit matrix for these filters."
                : "Choose filters and run Search to load the deposit matrix."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const rounds = Array.from({ length: data.rounds }, (_, index) => index + 1);
  const formatCell = mode === "count" ? formatMatrixCount : formatMatrixPercent;
  const values = mode === "count" ? data.counts : data.percents;
  const rowTotals = mode === "count" ? data.rowSums : data.percentRowSums;
  const cellMax = mode === "percent" ? 100 : Math.max(0, ...values.flat());

  return (
    <div className={cn("relative", loading && "opacity-60")} aria-busy={loading || undefined}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-[7rem] bg-background font-medium">Rank</TableHead>
            {rounds.map((round) => (
              <TableHead key={round} className="min-w-[3.25rem] text-right font-medium tabular-nums">
                {round}
              </TableHead>
            ))}
            <TableHead className="min-w-[4rem] text-right font-medium tabular-nums">SUM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.buckets.map((bucket, rowIndex) => (
            <TableRow key={bucket.key}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium whitespace-nowrap">
                {bucket.label}
              </TableCell>
              {rounds.map((round) => {
                const value = values[rowIndex]?.[round - 1] ?? 0;
                return (
                  <TableCell
                    key={round}
                    className={cn("text-right tabular-nums", heatmapClassName(value, cellMax))}
                  >
                    {formatCell(value)}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-medium tabular-nums">
                {formatCell(rowTotals[rowIndex] ?? 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DepositMatrixTable;
