"use client";

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
        emptyTitle={hasSearched ? "No members found for selected channel" : "Select channel and click Search"}
        emptyDescription={
          hasSearched
            ? "Try adjusting your filters."
            : "Choose a channel type and date range, then run Search to load members."
        }
      />
      <DataTablePagination table={table} total={total} pageSizeOptions={[20, 50, 100]} />
    </div>
  );
};

export default Royalty21Table;
