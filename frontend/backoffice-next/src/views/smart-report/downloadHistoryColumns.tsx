"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DownloadHistoryRecord } from "@/types/smartReport";

import { formatDateTime } from "./formatters";

export function createDownloadHistoryColumns(
  onDownload: (record: DownloadHistoryRecord) => void,
  options?: { includeReportName?: boolean },
): ColumnDef<DownloadHistoryRecord>[] {
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

  columns.push(
    {
      id: "startedAt",
      header: options?.includeReportName ? "Generated At" : "Run Date",
      enableHiding: true,
      accessorFn: (record) => formatDateTime(record.finishedAt ?? record.startedAt),
      cell: ({ row }) => formatDateTime(row.original.finishedAt ?? row.original.startedAt),
    },
    {
      id: "format",
      accessorKey: "format",
      header: "File Type",
      enableHiding: true,
      cell: ({ row }) => (
        <Badge variant={row.original.format === "csv" ? "secondary" : "default"}>
          {row.original.format.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      enableHiding: true,
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "success") return <Badge>Success</Badge>;
        if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
        return <Badge variant="secondary">Running</Badge>;
      },
    },
    {
      id: "download",
      header: "Download",
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          disabled={row.original.status !== "success" || !row.original.fileName}
          onClick={() => onDownload(row.original)}
        >
          <Download data-icon="inline-start" />
          Download
        </Button>
      ),
    },
  );

  return columns;
}
