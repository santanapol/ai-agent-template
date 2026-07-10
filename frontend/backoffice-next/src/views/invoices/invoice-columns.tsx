"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Link } from "@/navigation/compat";
import type { Invoice } from "@/types/invoice";

import { formatDate, formatMoney, statusTagColor } from "./utils";

export interface InvoiceColumnHandlers {
  listSearch: string;
}

export function invoiceDetailHref(invoiceId: string, listSearch: string): string {
  if (!listSearch) return `/invoices/${invoiceId}`;
  return `/invoices/${invoiceId}?${new URLSearchParams({ return: listSearch }).toString()}`;
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
  const { listSearch } = handlers;

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
      header: () => <div className="text-right">Amount</div>,
      enableHiding: true,
      meta: { align: "right" },
      accessorFn: (record) => formatMoney(record.amount),
      cell: ({ row }) => <div className="text-right tabular-nums">{formatMoney(row.original.amount)}</div>,
    },
    {
      id: "action",
      header: "Action",
      enableHiding: false,
      cell: ({ row }) => (
        <Link
          to={invoiceDetailHref(row.original._id, listSearch)}
          aria-label={`View invoice ${row.original.iv_no}`}
          title="View details"
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
        >
          <Eye aria-hidden="true" />
        </Link>
      ),
    },
  ];
}
