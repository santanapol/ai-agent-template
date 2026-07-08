"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Link2, Settings, Trash2 } from "lucide-react";

import { ActiveBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Agent } from "@/types/agents";

function normalizeRefFeeBranchId(refId: unknown): string {
  if (typeof refId === "object" && refId !== null) {
    const oid = (refId as { $oid?: string }).$oid;
    if (oid) return oid;
  }
  return String(refId);
}

export interface AgentColumnHandlers {
  onManageFees: (record: Agent) => void;
  onDelete: (record: Agent) => void;
}

export function createAgentsColumns(handlers: AgentColumnHandlers): ColumnDef<Agent>[] {
  const { onManageFees, onDelete } = handlers;

  return [
    {
      id: "branch_code",
      accessorKey: "branch_code",
      header: "Branch Code",
      enableHiding: true,
      cell: ({ row }) => <Badge variant="outline">{row.original.branch_code}</Badge>,
    },
    {
      id: "branch_name",
      accessorKey: "branch_name",
      header: "Branch Name",
      enableHiding: true,
    },
    {
      id: "branch_type",
      accessorKey: "branch_type",
      header: "Type",
      enableHiding: true,
      cell: ({ row }) => (
        <Badge variant={row.original.branch_type === "MA" ? "default" : "secondary"}>{row.original.branch_type}</Badge>
      ),
    },
    {
      id: "ref_fee_branch_id",
      header: "Ref Fee Branch",
      enableHiding: true,
      accessorFn: (record) => record.ref_fee_branch_name ?? record.ref_fee_branch_id ?? "—",
      cell: ({ row }) => {
        const record = row.original;
        const refId = record.ref_fee_branch_id;
        if (!refId) return <span className="text-muted-foreground">—</span>;
        const normalizedRefId = normalizeRefFeeBranchId(refId);
        return record.ref_fee_branch_name ? (
          <Badge variant="outline">
            <Link2 data-icon="inline-start" />
            {record.ref_fee_branch_name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">{normalizedRefId}</span>
        );
      },
    },
    {
      id: "default_fee_rate",
      accessorKey: "default_fee_rate",
      header: "Default Fee (%)",
      enableHiding: true,
      meta: { align: "right" },
      cell: ({ row }) => <strong>{row.original.default_fee_rate ?? 0}%</strong>,
    },
    {
      id: "active",
      header: "Status",
      enableHiding: true,
      accessorKey: "active",
      cell: ({ row }) => <ActiveBadge active={row.original.active} />,
    },
    {
      id: "actions",
      header: "Action",
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Manage fees for ${record.branch_name}`}
                    onClick={() => onManageFees(record)}
                  >
                    <Settings aria-hidden="true" />
                  </Button>
                }
              />
              <TooltipContent>Manage fees</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-destructive"
                    aria-label={`Delete ${record.branch_name}`}
                    onClick={() => onDelete(record)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                }
              />
              <TooltipContent>Delete agent</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];
}
