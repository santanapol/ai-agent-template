"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Archive, Eye, Pencil, RotateCcw } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StaffProfile } from "@/types/staff";

export interface StaffColumnHandlers {
  onView: (record: StaffProfile) => void;
  onEdit?: (record: StaffProfile) => void;
  onArchive: (record: StaffProfile) => void;
  onRestore: (record: StaffProfile) => void;
}

export function createStaffColumns(handlers: StaffColumnHandlers): ColumnDef<StaffProfile>[] {
  const { onView, onEdit, onArchive, onRestore } = handlers;

  return [
    {
      id: "code",
      accessorKey: "code",
      header: "Code",
      enableHiding: true,
    },
    {
      id: "name",
      header: "Name",
      enableHiding: true,
      accessorFn: (record) => `${record.firstname} ${record.lastname}`,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.firstname} {row.original.lastname}
        </span>
      ),
    },
    {
      id: "username",
      header: "Username",
      enableHiding: true,
      accessorFn: (record) => record.user?.username ?? "—",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.user?.username ?? "—"}</span>,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      enableHiding: true,
    },
    {
      id: "tel",
      accessorKey: "tel",
      header: "Tel",
      enableHiding: true,
    },
    {
      id: "status",
      header: "Status",
      enableHiding: true,
      accessorKey: "status",
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          variant={row.original.status === "active" ? "success" : "secondary"}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="icon-sm" aria-label="View profile" onClick={() => onView(record)}>
                    <Eye />
                  </Button>
                }
              />
              <TooltipContent>View profile</TooltipContent>
            </Tooltip>
            {onEdit ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="outline" size="icon-sm" aria-label="Edit profile" onClick={() => onEdit(record)}>
                      <Pencil />
                    </Button>
                  }
                />
                <TooltipContent>Edit profile</TooltipContent>
              </Tooltip>
            ) : null}
            {record.status === "active" ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="text-destructive"
                      aria-label="Archive profile"
                      onClick={() => onArchive(record)}
                    >
                      <Archive />
                    </Button>
                  }
                />
                <TooltipContent>Archive profile</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="text-success"
                      aria-label="Restore profile"
                      onClick={() => onRestore(record)}
                    >
                      <RotateCcw />
                    </Button>
                  }
                />
                <TooltipContent>Restore profile</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];
}
