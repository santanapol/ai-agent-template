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
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Report } from "@/types/smartReport";

import {
  formatScheduleLabel,
  formatScheduleShort,
  formatValidationStatusLabel,
  type ReportRow,
  type ReportStatus,
} from "./formatters";

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
  onRunReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onViewFiles: (reportId: string) => void;
  onDeleteReport: (report: Report) => void;
}

export function createReportColumns(handlers: ReportColumnHandlers): ColumnDef<ReportRow>[] {
  const { isMobile, runningId, onRunReport, onEditReport, onViewFiles, onDeleteReport } = handlers;

  const columns: ColumnDef<ReportRow>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Report",
      enableHiding: true,
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex min-w-0 max-w-xs flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{record.name}</span>
              {record.enabled === false ? <Badge variant="outline">Disabled</Badge> : null}
            </div>
            {record.description ? (
              <span className="truncate text-muted-foreground text-sm">{record.description}</span>
            ) : null}
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
      cell: ({ row }) => {
        const fullLabel = formatScheduleLabel(row.original.schedule);
        const shortLabel = formatScheduleShort(row.original.schedule);
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex min-w-0 items-center gap-1 text-sm">
                  <Clock className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{shortLabel}</span>
                </span>
              }
            />
            <TooltipContent>{fullLabel}</TooltipContent>
          </Tooltip>
        );
      },
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
                    <Spinner data-icon="inline-start" />
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
                    disabled={record.derivedStatus === "running"}
                    onClick={() => void onEditReport(record)}
                  />
                }
              >
                <Pencil data-icon="inline-start" aria-hidden="true" />
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
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="icon-sm"
                          aria-label="Delete report"
                          disabled={record.derivedStatus === "running"}
                        />
                      }
                    />
                  }
                >
                  <Trash2 data-icon="inline-start" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Delete report</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Delete Report</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete report &quot;{record.name}&quot;? This script will be permanently
                    deleted, but previously generated report files will remain on the server.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={() => void onDeleteReport(record)}>
                    Delete Report
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  );

  return columns;
}
