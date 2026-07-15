// React Compiler caches the <DataTablePagination table={table} .../> element by prop identity;
// `table` never changes reference (TanStack mutates it in place), so a real pageSize change can
// get silently skipped here. Opt this file out of compiler memoization.
"use client";
"use no memo";

import type { Table } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";

import { DataTablePagination, DataTableView } from "@/components/data-table";
import type { StaffProfile } from "@/types/staff";

export interface StaffTablePagination {
  current: number;
  pageSize: number;
  total: number;
}

interface StaffTableProps {
  table: Table<StaffProfile>;
  loading: boolean;
  pagination: StaffTablePagination;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  emptyIcon?: LucideIcon;
}

const StaffTable: React.FC<StaffTableProps> = ({
  table,
  loading,
  pagination,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
}) => {
  return (
    <>
      <DataTableView
        table={table}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={emptyAction}
        emptyIcon={emptyIcon}
      />
      <DataTablePagination table={table} total={pagination.total} pageSizeOptions={[10, 20, 50]} />
    </>
  );
};

export default StaffTable;
