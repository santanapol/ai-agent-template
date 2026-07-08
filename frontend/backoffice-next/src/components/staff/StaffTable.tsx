"use client";

import type { Table } from "@tanstack/react-table";

import { DataTablePagination, DataTableView, type ListViewMode } from "@/components/data-table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffProfile } from "@/types/staff";

import type { StaffColumnHandlers } from "./staff-columns";

export interface StaffTablePagination {
  current: number;
  pageSize: number;
  total: number;
}

interface StaffTableProps {
  table: Table<StaffProfile>;
  loading: boolean;
  pagination: StaffTablePagination;
  viewMode: ListViewMode;
  handlers: StaffColumnHandlers;
}

function StaffGrid({ profiles, handlers }: { profiles: StaffProfile[]; handlers: StaffColumnHandlers }) {
  return (
    <div className="grid gap-3 px-4 sm:grid-cols-2 xl:grid-cols-3">
      {profiles.map((profile) => (
        <Card key={profile.id} size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {profile.firstname} {profile.lastname}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{profile.code}</p>
            <p>{profile.user?.username ?? "—"}</p>
            <StatusBadge status={profile.status} variant={profile.status === "active" ? "success" : "secondary"} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => handlers.onView(profile)}>
                View
              </Button>
              {handlers.onEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={() => handlers.onEdit?.(profile)}>
                  Edit
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const StaffTable: React.FC<StaffTableProps> = ({ table, loading, pagination, viewMode, handlers }) => {
  return (
    <>
      {viewMode === "list" ? (
        <DataTableView table={table} loading={loading} />
      ) : loading ? (
        <DataTableView table={table} loading />
      ) : (
        <StaffGrid profiles={table.getRowModel().rows.map((row) => row.original)} handlers={handlers} />
      )}
      <DataTablePagination table={table} total={pagination.total} pageSizeOptions={[10, 20, 50]} />
    </>
  );
};

export default StaffTable;
