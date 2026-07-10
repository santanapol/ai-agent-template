"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Clock, History, Pencil, Play, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Report } from "@/types/smartReport";

import { formatScheduleLabel, formatValidationStatusLabel, type ReportRow, type ReportStatus } from "./formatters";

function validationBadgeVariant(status: Report["validationStatus"] | undefined) {
  if (status === "valid") return "default" as const;
  if (status === "invalid") return "destructive" as const;
  return "secondary" as const;
}

function derivedStatusBadge(status: ReportStatus) {
  if (status === "running") return <Badge variant="secondary">Running</Badge>;
  if (status === "completed") return <Badge>Completed</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">Idle</Badge>;
}

export interface ReportColumnHandlers {
  isMobile: boolean;
  runningId: string | null;
  loadingEditId: string | null;
  onRunReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onViewFiles: (reportId: string) => void;
  onDeleteReport: (report: Report) => void;
}

export function createReportColumns(handlers: ReportColumnHandlers): ColumnDef<ReportRow>[] {
  const { isMobile, runningId, loadingEditId, onRunReport, onEditReport, onViewFiles, onDeleteReport } = handlers;

  const columns: ColumnDef<ReportRow>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Report",
      enableHiding: true,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex max-w-[18rem] items-center gap-1.5">
            <span className="truncate font-medium" title={record.description ?? undefined}>
              {record.name}
            </span>
            {record.enabled === false ? <Badge variant="outline">Disabled</Badge> : null}
          </div>
        );
      },
    },
  ];

  if (!isMobile) {
    columns.push({
      id: "schedule",
      header: "Schedule",
      enableHiding: true,
      accessorFn: (record) => formatScheduleLabel(record.schedule),
      cell: ({ row }) => (
        <span className="inline-flex max-w-[14rem] items-center gap-1 truncate text-sm">
          <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{formatScheduleLabel(row.original.schedule)}</span>
        </span>
      ),
    });
  }

  columns.push(
    {
      id: "validation",
      header: "Validation",
      enableHiding: true,
      accessorFn: (record) => record.validationStatus,
      cell: ({ row }) => (
        <Badge variant={validationBadgeVariant(row.original.validationStatus)}>
          {formatValidationStatusLabel(row.original.validationStatus)}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Status",
      enableHiding: true,
      accessorFn: (record) => record.derivedStatus,
      cell: ({ row }) => derivedStatusBadge(row.original.derivedStatus),
    },
    {
      id: "lastRun",
      accessorKey: "lastRun",
      header: "Last Run",
      enableHiding: true,
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.lastRun}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex items-center gap-1">
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Run report"
                          disabled={record.derivedStatus === "running" || runningId === record.id}
                        />
                      }
                    />
                  }
                >
                  {runningId === record.id ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Play data-icon="inline-start" aria-hidden="true" />
                  )}
                </TooltipTrigger>
                <TooltipContent>Run report</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Run this report now?</AlertDialogTitle>
                  <AlertDialogDescription>Heavy queries may take several minutes.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void onRunReport(record)}>Run</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Edit report"
                    disabled={
                      record.derivedStatus === "running" || (loadingEditId !== null && loadingEditId !== record.id)
                    }
                    onClick={() => void onEditReport(record)}
                  />
                }
              >
                {loadingEditId === record.id ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Pencil data-icon="inline-start" aria-hidden="true" />
                )}
              </TooltipTrigger>
              <TooltipContent>Edit report</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="View download history"
                    onClick={() => onViewFiles(record.id)}
                  />
                }
              >
                <History data-icon="inline-start" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>View download history</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Delete report"
                    disabled={record.derivedStatus === "running"}
                    onClick={() => onDeleteReport(record)}
                  />
                }
              >
                <Trash2 data-icon="inline-start" className="text-destructive" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Delete report</TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  );

  return columns;
}
