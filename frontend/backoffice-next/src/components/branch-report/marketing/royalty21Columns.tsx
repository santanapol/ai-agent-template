"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { formatDeposit, formatPromotion, formatSummary } from "@/lib/branch-report/royalty21Formatters";
import { cn } from "@/lib/utils";
import type { Royalty21Row } from "@/types/branchReport";

export function createRoyalty21Columns(): ColumnDef<Royalty21Row>[] {
  const depositCols: ColumnDef<Royalty21Row>[] = Array.from({ length: 21 }, (_, i) => ({
    id: `deposit_${i + 1}`,
    header: String(i + 1),
    enableHiding: true,
    accessorFn: (row) => formatDeposit(row.deposits?.[i] ?? 0),
    cell: ({ row }) => formatDeposit(row.original.deposits?.[i] ?? 0),
    meta: { align: "right" as const },
  }));

  return [
    {
      id: "username",
      accessorKey: "username",
      header: "Username",
      enableHiding: true,
    },
    {
      id: "register",
      accessorKey: "register",
      header: "Register",
      enableHiding: true,
    },
    {
      id: "billin",
      header: "Billin",
      enableHiding: true,
      accessorFn: (row) => formatSummary(row.billin),
      cell: ({ row }) => formatSummary(row.original.billin),
      meta: { align: "right" as const },
    },
    {
      id: "withdraw",
      header: "Withdraw",
      enableHiding: true,
      accessorFn: (row) => formatSummary(row.withdraw),
      cell: ({ row }) => formatSummary(row.original.withdraw),
      meta: { align: "right" as const },
    },
    {
      id: "promotion",
      header: "Promotion",
      enableHiding: true,
      accessorFn: (row) => formatPromotion(row.promotion),
      cell: ({ row }) => formatPromotion(row.original.promotion),
      meta: { align: "right" as const },
    },
    {
      id: "revenue",
      header: "Revenue",
      enableHiding: true,
      accessorFn: (row) => formatSummary(row.revenue),
      cell: ({ row }) => (
        <span className={cn(row.original.revenue < 0 && "text-destructive")}>
          {formatSummary(row.original.revenue)}
        </span>
      ),
      meta: { align: "right" as const },
    },
    ...depositCols,
  ];
}
