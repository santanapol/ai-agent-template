// React Compiler caches the <DataTablePagination table={table} .../> element by prop identity;
// `table` never changes reference (TanStack mutates it in place), so a real pageSize change can
// get silently skipped here. Opt this file out of compiler memoization.
"use client";
"use no memo";

import type React from "react";

import type { Table } from "@tanstack/react-table";

import { DataTablePagination, DataTableView } from "@/components/data-table";
import type { Royalty21Row } from "@/types/branchReport";

interface Royalty21TableProps {
  table: Table<Royalty21Row>;
  loading: boolean;
  hasSearched: boolean;
  total: number;
}

const Royalty21Table: React.FC<Royalty21TableProps> = ({ table, loading, hasSearched, total }) => {
  return (
    <div className="overflow-x-auto">
      <DataTableView
        table={table}
        loading={loading}
        emptyTitle={hasSearched ? "No members match these filters" : "Run Search to load report"}
        emptyDescription={
          hasSearched
            ? "Check the username, channel, or register dates, then search again."
            : "Choose a channel type and register date range, then run Search to load members."
        }
      />
      <DataTablePagination table={table} total={total} pageSizeOptions={[20, 50, 100]} />
    </div>
  );
};

export default Royalty21Table;
