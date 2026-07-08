"use client";

import { useMemo, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import { Code2, History, Plus } from "lucide-react";

import {
  DataTablePagination,
  DataTableToolbarActions,
  DataTableView,
  useClientDataTable,
} from "@/components/data-table";
import { ListPageCard } from "@/components/layout";
import { InlineFilterSelect, ListPageSearch } from "@/components/list-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DownloadHistoryRecord, DownloadHistoryStatus, Report } from "@/types/smartReport";

import { createDownloadHistoryColumns } from "./smart-report/downloadHistoryColumns";
import type { ReportRow } from "./smart-report/formatters";
import { createReportColumns } from "./smart-report/report-columns";

const HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

export interface SmartReportListProps {
  isMobile: boolean;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  reportRows: ReportRow[];
  history: DownloadHistoryRecord[];
  loading: boolean;
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
  activeTab,
  onActiveTabChange,
  reportRows,
  history,
  loading,
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
  const [reportSearch, setReportSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<DownloadHistoryStatus | "all">("all");
  const [reportColumnVisibility, setReportColumnVisibility] = useState<VisibilityState>({});
  const [historyColumnVisibility, setHistoryColumnVisibility] = useState<VisibilityState>({});

  const filteredReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    if (!query) return reportRows;
    return reportRows.filter(
      (row) => row.name.toLowerCase().includes(query) || (row.description?.toLowerCase().includes(query) ?? false),
    );
  }, [reportRows, reportSearch]);

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    return history.filter((record) => {
      const matchesSearch =
        !query ||
        record.reportName.toLowerCase().includes(query) ||
        (record.fileName?.toLowerCase().includes(query) ?? false);
      const matchesStatus = historyStatusFilter === "all" || record.status === historyStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [history, historySearch, historyStatusFilter]);

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

  const historyColumns = useMemo(
    () => createDownloadHistoryColumns(onDownload, { includeReportName: true }),
    [onDownload],
  );

  const drawerColumns = useMemo(() => createDownloadHistoryColumns(onDownload), [onDownload]);

  const reportsTable = useClientDataTable({
    data: filteredReportRows,
    columns: reportColumns,
    initialPageSize: 10,
    columnVisibility: reportColumnVisibility,
    onColumnVisibilityChange: setReportColumnVisibility,
    getRowId: (row) => row.id,
  });

  const historyTable = useClientDataTable({
    data: filteredHistory,
    columns: historyColumns,
    initialPageSize: 10,
    columnVisibility: historyColumnVisibility,
    onColumnVisibilityChange: setHistoryColumnVisibility,
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
            {activeTab === "reports" ? (
              <ListPageSearch
                id="smart-report-search"
                placeholder="Search reports..."
                value={reportSearch}
                onChange={setReportSearch}
              />
            ) : (
              <ListPageSearch
                id="smart-report-history-search"
                placeholder="Search history..."
                value={historySearch}
                onChange={setHistorySearch}
              />
            )}
            {activeTab === "reports" ? (
              <DataTableToolbarActions table={reportsTable} exportFileName="smart-reports" />
            ) : (
              <DataTableToolbarActions table={historyTable} exportFileName="smart-report-history" />
            )}
            <Button size="lg" onClick={onCreateNew}>
              <Plus data-icon="inline-start" />
              Create report
            </Button>
          </>
        }
        filterRow={
          activeTab === "history" ? (
            <InlineFilterSelect
              id="smart-report-history-status"
              prefix="Status:"
              value={historyStatusFilter}
              options={HISTORY_STATUS_OPTIONS}
              onChange={(value) => setHistoryStatusFilter(value as DownloadHistoryStatus | "all")}
            />
          ) : null
        }
        headerAddon={
          <Alert>
            <Code2 data-icon="inline-start" aria-hidden="true" />
            <AlertTitle>Secure Read-Only Access</AlertTitle>
            <AlertDescription>
              All reports run on secondary database replicas in read-only mode. Heavy queries or aggregation pipelines
              can be executed safely without affecting the main transactional server performance.
            </AlertDescription>
          </Alert>
        }
      >
        <Tabs value={activeTab} onValueChange={onActiveTabChange} className="px-4">
          <TabsList>
            <TabsTrigger value="reports">
              <Code2 data-icon="inline-start" />
              Report Scripts
            </TabsTrigger>
            <TabsTrigger value="history">
              <History data-icon="inline-start" />
              Download History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reports" className="mt-4">
            <DataTableView table={reportsTable} loading={loading} />
            <DataTablePagination table={reportsTable} pageSizeOptions={[10, 20, 50]} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <DataTableView
              table={historyTable}
              loading={loading}
              emptyTitle="No download history"
              emptyDescription="Run a report to see execution history here."
            />
            <DataTablePagination table={historyTable} pageSizeOptions={[10, 20, 50]} />
          </TabsContent>
        </Tabs>
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
                <EmptyTitle>No history</EmptyTitle>
                <EmptyDescription>No execution history or saved files for this script.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
