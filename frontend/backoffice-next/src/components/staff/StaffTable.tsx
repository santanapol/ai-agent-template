"use client";

import type { Table } from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";

import { DataTablePagination, DataTableView, type ListViewMode } from "@/components/data-table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  emptyIcon?: LucideIcon;
}

function StaffGrid({
  profiles,
  handlers,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon: EmptyIcon = Users,
}: {
  profiles: StaffProfile[];
  handlers: StaffColumnHandlers;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  emptyIcon?: LucideIcon;
}) {
  if (profiles.length === 0) {
    return (
      <div className="px-4 py-12">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <EmptyIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle ?? "No data found"}</EmptyTitle>
            <EmptyDescription>{emptyDescription ?? "Try adjusting your filters."}</EmptyDescription>
          </EmptyHeader>
          {emptyAction ? (
            <EmptyContent>
              <Button type="button" variant="outline" onClick={emptyAction.onClick}>
                {emptyAction.label}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-4 sm:grid-cols-2 xl:grid-cols-3">
      {profiles.map((profile) => (
        <Card key={profile.id} size="sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {profile.firstname} {profile.lastname}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
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

const StaffTable: React.FC<StaffTableProps> = ({
  table,
  loading,
  pagination,
  viewMode,
  handlers,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
}) => {
  return (
    <>
      {viewMode === "list" ? (
        <DataTableView
          table={table}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
          emptyIcon={emptyIcon}
        />
      ) : loading ? (
        <DataTableView table={table} loading />
      ) : (
        <StaffGrid
          profiles={table.getRowModel().rows.map((row) => row.original)}
          handlers={handlers}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
          emptyIcon={emptyIcon}
        />
      )}
      <DataTablePagination table={table} total={pagination.total} pageSizeOptions={[10, 20, 50]} />
    </>
  );
};

export default StaffTable;
