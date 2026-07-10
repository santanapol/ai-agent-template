import type { VariantProps } from "class-variance-authority";
import dayjs from "dayjs";

import type { badgeVariants } from "@/components/ui/badge";

import type { InvoiceStatus, InvoiceTransaction, ListInvoicesParams } from "../../types/invoice";
import { INVOICE_STATUSES } from "../../types/invoice";

export function formatMoney(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatDate(val: string | null | undefined): string {
  if (!val) return "-";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isDueDateOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "PAID" || status === "VOID") return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function formatFee(fee: number | "N/A"): string {
  if (fee === "N/A") return "N/A";
  return `${fee}%`;
}

export function formatCategoryName(name: string | null | undefined): string {
  if (!name) return "-";
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
  PENDING: "secondary",
  VOID: "secondary",
  CAL: "outline",
  MISSING_FEE: "warning",
  READY: "warning",
  ERROR: "destructive",
  PAID: "success",
};

export function statusTagColor(status: string): BadgeVariant {
  return STATUS_VARIANTS[status as InvoiceStatus] ?? "secondary";
}

export function ribbonColor(status: string): string {
  if (status === "PAID") return "green";
  if (status === "READY") return "blue";
  if (status === "PENDING") return "orange";
  if (status === "ERROR") return "red";
  return "blue";
}

export function sortInvoiceTransactions(transactions: InvoiceTransaction[]): InvoiceTransaction[] {
  return [...transactions].sort((a, b) => (a.company_name || "").localeCompare(b.company_name || ""));
}

/** Matches agent-invoice `ALL_BRANCHES_QUERY` — omit branch filter on list API. */
export const INVOICE_BRANCH_FILTER_ALL = "all";

export interface InvoiceListFilterState {
  searchText: string;
  selectedBranchId?: string;
  selectedStatus?: InvoiceStatus;
  billingMonth: string;
  page: number;
  pageSize: number;
}

export function parseInvoiceListSearchParams(searchParams: URLSearchParams): InvoiceListFilterState {
  const branchId = searchParams.get("branch_id");
  const rawStatus = searchParams.get("status");
  const selectedStatus =
    rawStatus && (INVOICE_STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as InvoiceStatus) : undefined;
  return {
    searchText: searchParams.get("search") ?? "",
    selectedBranchId: !branchId || branchId === INVOICE_BRANCH_FILTER_ALL ? undefined : branchId,
    selectedStatus,
    billingMonth: searchParams.get("billing_month") ?? dayjs().format("YYYY-MM"),
    page: Number(searchParams.get("page")) || 1,
    pageSize: Number(searchParams.get("page_size")) || 10,
  };
}

export function buildInvoiceListQuery(input: {
  page: number;
  limit: number;
  ivNo?: string;
  branchId?: string;
  billingMonth?: string;
  status?: string;
}): ListInvoicesParams {
  const ivNo = input.ivNo?.trim();
  const params: ListInvoicesParams = {
    page: input.page,
    limit: input.limit,
    branch_id: input.branchId ?? INVOICE_BRANCH_FILTER_ALL,
    billing_month: input.billingMonth ?? undefined,
    status: input.status,
  };
  if (ivNo) {
    params.iv_no = ivNo;
  }
  return params;
}

/** Stable URLSearchParams for invoice list filters (used for URL sync + list navigation state). */
export function buildInvoiceListSearchParams(input: {
  searchText: string;
  selectedBranchId?: string;
  selectedStatus?: string;
  billingMonth: string;
  page: number;
  pageSize: number;
}): URLSearchParams {
  const params = new URLSearchParams();
  const trimmed = input.searchText.trim();
  if (trimmed) params.set("search", trimmed);
  params.set("branch_id", input.selectedBranchId ?? INVOICE_BRANCH_FILTER_ALL);
  if (input.selectedStatus) params.set("status", input.selectedStatus);
  if (input.billingMonth) params.set("billing_month", input.billingMonth);
  if (input.page !== 1) params.set("page", String(input.page));
  if (input.pageSize !== 10) params.set("page_size", String(input.pageSize));
  return params;
}
