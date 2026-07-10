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
import { type InlineFilterOption, InlineFilterSelect, ListPageSearch } from "@/components/list-page";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { DownloadHistoryRecord, Report } from "@/types/smartReport";

import { createDownloadHistoryColumns } from "./smart-report/downloadHistoryColumns";
import type { ReportRow } from "./smart-report/formatters";
import { createReportColumns } from "./smart-report/report-columns";

export type EnabledFilter = "all" | "enabled" | "disabled";
export type ScheduleFilter = "all" | "manual" | "daily" | "weekly" | "monthly";

const ENABLED_FILTER_OPTIONS: InlineFilterOption[] = [
  { value: "all", label: "All" },
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const SCHEDULE_FILTER_OPTIONS: InlineFilterOption[] = [
  { value: "all", label: "All" },
  { value: "manual", label: "Manual" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export interface SmartReportListProps {
  isMobile: boolean;
  reportRows: ReportRow[];
  reportsPage: number;
  reportsPageSize: number;
  reportsTotal: number;
  onReportsPaginationChange: (pageIndex: number, pageSize: number) => void;
  reportsLoading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  enabledFilter: EnabledFilter;
  onEnabledFilterChange: (value: EnabledFilter) => void;
  scheduleFilter: ScheduleFilter;
  onScheduleFilterChange: (value: ScheduleFilter) => void;
  runningId: string | null;
  loadingEditId: string | null;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerLoading: boolean;
  selectedReport: Report | null;
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
  searchValue,
  onSearchChange,
  enabledFilter,
  onEnabledFilterChange,
  scheduleFilter,
  onScheduleFilterChange,
  runningId,
  loadingEditId,
  isDrawerOpen,
  onDrawerOpenChange,
  drawerLoading,
  selectedReport,
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

  const selectedReportName = selectedReport?.name ?? "";

  return (
    <>
      <ListPageCard
        title="Smart Reports"
        description="Automated reporting and scheduling system. Fetches data directly via a read-only database replica."
        descriptionClassName="max-w-2xl"
        toolbar={
          <>
            <ListPageSearch
              id="smart-reports-search"
              placeholder="Search report name or description…"
              value={searchValue}
              onChange={onSearchChange}
            />
            <DataTableToolbarActions table={reportsTable} exportFileName="smart-reports" showColumnVisibility={false} />
            <Button onClick={onCreateNew}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create report
            </Button>
          </>
        }
        filterRow={
          <>
            <InlineFilterSelect
              id="smart-reports-enabled"
              prefix="Enabled:"
              value={enabledFilter}
              options={ENABLED_FILTER_OPTIONS}
              onChange={(value) => onEnabledFilterChange(value as EnabledFilter)}
            />
            <InlineFilterSelect
              id="smart-reports-schedule"
              prefix="Schedule:"
              value={scheduleFilter}
              options={SCHEDULE_FILTER_OPTIONS}
              onChange={(value) => onScheduleFilterChange(value as ScheduleFilter)}
            />
          </>
        }
      >
        <DataTableView
          table={reportsTable}
          loading={reportsLoading}
          emptyTitle="No reports yet"
          emptyDescription="Create a report script to automate exports from the read replica."
          emptyAction={{ label: "Create report", onClick: onCreateNew }}
        />
        <DataTablePagination table={reportsTable} pageSizeOptions={[10, 20, 50]} total={reportsTotal} />
      </ListPageCard>

      <Sheet open={isDrawerOpen} onOpenChange={onDrawerOpenChange}>
        <SheetContent className={isMobile ? "w-full" : "sm:max-w-xl"}>
          <SheetHeader>
            <SheetTitle>Download History: {selectedReportName}</SheetTitle>
            <SheetDescription>Execution history and saved downloads for this report script.</SheetDescription>
          </SheetHeader>
          {drawerLoading ? (
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : selectedReportDownloads.length > 0 ? (
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
                {selectedReport ? (
                  <Button onClick={() => onRunReport(selectedReport)}>Run report</Button>
                ) : null}
              </EmptyContent>
            </Empty>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
