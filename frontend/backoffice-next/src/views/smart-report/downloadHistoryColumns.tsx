"use client";

import type React from "react";

import type { ColumnDef } from "@tanstack/react-table";
import { Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DownloadHistoryRecord } from "@/types/smartReport";

import { formatDateTime, formatDateTimeCompact, formatDownloadTrigger, formatRecordCount } from "./formatters";

function startedAtHeader(includeReportName: boolean | undefined, isDrawer: boolean): string {
  if (includeReportName) return "Generated At";
  return isDrawer ? "Run" : "Run Date";
}

function downloadActionLabel(record: DownloadHistoryRecord): string {
  if (record.status === "success" && record.fileName) {
    return `Download ${record.fileName}`;
  }
  if (record.status === "failed") {
    return "Download unavailable — run failed";
  }
  if (record.status === "running") {
    return "Download unavailable — run in progress";
  }
  return "Download unavailable";
}

function StatusCell({ record }: { record: DownloadHistoryRecord }) {
  const { status, error } = record;
  let badge: React.ReactNode;
  if (status === "success") {
    badge = <Badge variant="secondary">Success</Badge>;
  } else if (status === "failed") {
    badge = <Badge variant="destructive">Failed</Badge>;
  } else {
    badge = <Badge variant="outline">Running</Badge>;
  }

  if (status === "failed" && error) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex max-w-full">{badge}</span>} />
        <TooltipContent className="max-w-xs text-pretty">{error}</TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

export function createDownloadHistoryColumns(
  onDownload: (record: DownloadHistoryRecord) => void,
  options?: { includeReportName?: boolean; variant?: "default" | "drawer" },
): ColumnDef<DownloadHistoryRecord>[] {
  const isDrawer = options?.variant === "drawer";
  const columns: ColumnDef<DownloadHistoryRecord>[] = [];

  if (options?.includeReportName) {
    columns.push({
      id: "reportName",
      accessorKey: "reportName",
      header: "Report Name",
      enableHiding: true,
      cell: ({ row }) => (
        <span className="flex items-center gap-2 font-medium">
          <FileText data-icon="inline-start" aria-hidden="true" />
          {row.original.reportName}
        </span>
      ),
    });
  }

  columns.push({
    id: "startedAt",
    header: startedAtHeader(options?.includeReportName, isDrawer),
    enableHiding: true,
    accessorFn: (record) => formatDateTime(record.finishedAt ?? record.startedAt),
    cell: ({ row }) => {
      const full = formatDateTime(row.original.finishedAt ?? row.original.startedAt);
      if (!isDrawer) {
        return full;
      }
      const compact = formatDateTimeCompact(row.original.finishedAt ?? row.original.startedAt);
      return (
        <Tooltip>
          <TooltipTrigger render={<span className="block max-w-[6.5rem] truncate tabular-nums">{compact}</span>} />
          <TooltipContent>{full}</TooltipContent>
        </Tooltip>
      );
    },
  });

  columns.push({
    id: "format",
    accessorKey: "format",
    header: isDrawer ? "Type" : "File Type",
    enableHiding: true,
    cell: ({ row }) => (
      <Badge variant={row.original.format === "csv" ? "secondary" : "default"}>
        {row.original.format.toUpperCase()}
      </Badge>
    ),
  });

  if (isDrawer) {
    columns.push(
      {
        id: "triggeredBy",
        accessorKey: "triggeredBy",
        header: "Source",
        enableHiding: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">{formatDownloadTrigger(row.original.triggeredBy)}</span>
        ),
      },
      {
        id: "recordCount",
        accessorKey: "recordCount",
        header: "Rows",
        enableHiding: true,
        meta: { align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatRecordCount(row.original.recordCount)}</span>,
      },
    );
  }

  columns.push({
    id: "status",
    accessorKey: "status",
    header: "Status",
    enableHiding: true,
    cell: ({ row }) => <StatusCell record={row.original} />,
  });

  columns.push({
    id: "download",
    header: isDrawer ? "" : "Download",
    enableHiding: false,
    meta: isDrawer ? { align: "right" } : undefined,
    cell: ({ row }) => {
      const record = row.original;
      const canDownload = record.status === "success" && !!record.fileName;
      const label = downloadActionLabel(record);

      if (isDrawer) {
        return (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={label}
                  disabled={!canDownload}
                  onClick={() => onDownload(record)}
                />
              }
            >
              <Download aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      }

      return (
        <Button size="sm" disabled={!canDownload} onClick={() => onDownload(record)}>
          <Download data-icon="inline-start" />
          Download
        </Button>
      );
    },
  });

  return columns;
}
