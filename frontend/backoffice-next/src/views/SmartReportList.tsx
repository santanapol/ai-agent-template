"use client";

import { useMemo, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import { History, Plus } from "lucide-react";

import {
  DataTablePagination,
  DataTableToolbarActions,
  DataTableView,
  useClientDataTable,
  useServerDataTable,
} from "@/components/data-table";
import { ListPageCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DownloadHistoryRecord, Report } from "@/types/smartReport";

import { createDownloadHistoryColumns } from "./smart-report/downloadHistoryColumns";
import type { ReportRow } from "./smart-report/formatters";
import { createReportColumns } from "./smart-report/report-columns";

export interface SmartReportListProps {
  isMobile: boolean;
  reportRows: ReportRow[];
  reportsPage: number;
  reportsPageSize: number;
  reportsTotal: number;
  onReportsPaginationChange: (pageIndex: number, pageSize: number) => void;
  reportsLoading: boolean;
  runningId: string | null;
  loadingEditId: string | null;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  selectedReportName: string;
  selectedReportDownloads: DownloadHistoryRecord[];
  onCreateNew: () => void;
  onRunReport: (report: Report) => void;
  onEditReport: (report: Report) => void;
  onViewFiles: (reportId: string) => void;
  onDeleteReport: (report: Report) => void;
  onDownload: (record: DownloadHistoryRecord) => void;
}

export function SmartReportList({
  isMobile,
  reportRows,
  reportsPage,
  reportsPageSize,
  reportsTotal,
  onReportsPaginationChange,
  reportsLoading,
  runningId,
  loadingEditId,
  isDrawerOpen,
  onDrawerOpenChange,
  selectedReportName,
  selectedReportDownloads,
  onCreateNew,
  onRunReport,
  onEditReport,
  onViewFiles,
  onDeleteReport,
  onDownload,
}: SmartReportListProps) {
  const [reportColumnVisibility, setReportColumnVisibility] = useState<VisibilityState>({});

  const reportColumnHandlers = useMemo(
    () => ({
      isMobile,
      runningId,
      loadingEditId,
      onRunReport,
      onEditReport,
      onViewFiles,
      onDeleteReport,
    }),
    [isMobile, runningId, loadingEditId, onRunReport, onEditReport, onViewFiles, onDeleteReport],
  );

  const reportColumns = useMemo(() => createReportColumns(reportColumnHandlers), [reportColumnHandlers]);
  const drawerColumns = useMemo(() => createDownloadHistoryColumns(onDownload), [onDownload]);
  const reportsPageCount = Math.max(1, Math.ceil(reportsTotal / reportsPageSize));

  const reportsTable = useServerDataTable({
    data: reportRows,
    columns: reportColumns,
    pageIndex: reportsPage - 1,
    pageSize: reportsPageSize,
    pageCount: reportsPageCount,
    onPaginationChange: (pagination) => onReportsPaginationChange(pagination.pageIndex, pagination.pageSize),
    columnVisibility: reportColumnVisibility,
    onColumnVisibilityChange: setReportColumnVisibility,
    getRowId: (row) => row.id,
  });

  const drawerTable = useClientDataTable({
    data: selectedReportDownloads,
    columns: drawerColumns,
    initialPageSize: 8,
    getRowId: (row) => row.id,
  });

  return (
    <>
      <ListPageCard
        title="Smart Report"
        description="Automated reporting and scheduling system. Fetches data directly via a read-only database replica."
        toolbar={
          <>
            <DataTableToolbarActions table={reportsTable} exportFileName="smart-reports" showColumnVisibility={false} />
            <Button onClick={onCreateNew}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create report
            </Button>
          </>
        }
      >
        <DataTableView table={reportsTable} loading={reportsLoading} />
        <DataTablePagination table={reportsTable} pageSizeOptions={[10, 20, 50]} total={reportsTotal} />
      </ListPageCard>

      <Sheet open={isDrawerOpen} onOpenChange={onDrawerOpenChange}>
        <SheetContent className={isMobile ? "w-full" : "sm:max-w-xl"}>
          <SheetHeader>
            <SheetTitle>Download History: {selectedReportName}</SheetTitle>
            <SheetDescription>Execution history and saved downloads for this report script.</SheetDescription>
          </SheetHeader>
          {selectedReportDownloads.length > 0 ? (
            <div className="mt-4">
              <DataTableView table={drawerTable} />
              <DataTablePagination table={drawerTable} pageSizeOptions={[8, 10, 20]} />
            </div>
          ) : (
            <Empty className="mt-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <History aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No history</EmptyTitle>
                <EmptyDescription>No execution history or saved files for this script.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <p className="text-muted-foreground text-sm">Run a report to see execution history here.</p>
              </EmptyContent>
            </Empty>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
