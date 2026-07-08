"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Invoice } from "@/types/invoice";

import { formatDate, formatMoney, statusTagColor } from "./utils";

export interface InvoiceColumnHandlers {
  onView: (invoice: Invoice, listSearch: string) => void;
  listSearch: string;
}

export function createInvoiceSelectColumn(): ColumnDef<Invoice> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`Select invoice ${row.original.iv_no}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

export function createInvoiceColumns(handlers: InvoiceColumnHandlers): ColumnDef<Invoice>[] {
  const { onView, listSearch } = handlers;

  return [
    createInvoiceSelectColumn(),
    {
      id: "iv_no",
      accessorKey: "iv_no",
      header: "Invoice No",
      enableHiding: true,
    },
    {
      id: "branch_name",
      header: "Branch Name",
      enableHiding: true,
      accessorFn: (record) => record.branch_name ?? "—",
      cell: ({ row }) => row.original.branch_name || "—",
    },
    {
      id: "status",
      header: "Status",
      enableHiding: true,
      accessorKey: "status",
      cell: ({ row }) => <StatusBadge status={row.original.status} variant={statusTagColor(row.original.status)} />,
    },
    {
      id: "billing_month",
      header: "Billing Month",
      enableHiding: true,
      accessorFn: (record) => record.billing_month ?? "—",
      cell: ({ row }) => row.original.billing_month || "—",
    },
    {
      id: "due_date",
      header: "Due Date",
      enableHiding: true,
      accessorFn: (record) => formatDate(record.due_date),
      cell: ({ row }) => formatDate(row.original.due_date),
    },
    {
      id: "amount",
      header: "Amount",
      enableHiding: true,
      meta: { align: "right" },
      accessorFn: (record) => formatMoney(record.amount),
      cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount)}</span>,
    },
    {
      id: "action",
      header: "Action",
      enableHiding: false,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`View invoice ${row.original.iv_no}`}
                onClick={() => onView(row.original, listSearch)}
              >
                <Eye />
              </Button>
            }
          />
          <TooltipContent>View details</TooltipContent>
        </Tooltip>
      ),
    },
  ];
}
