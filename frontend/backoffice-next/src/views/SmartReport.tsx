import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useIsMobile } from "@/hooks/useMobile";
import { apiErrorMessage } from "@/lib/apiError";
import {
  buildEtagFromUpdDate,
  deleteReport,
  downloadReportFile,
  listHistory,
  listReports,
  runReport,
} from "@/lib/smartReportApiClient";
import { useNavigate } from "@/navigation/compat";
import type { DownloadHistoryRecord, Report } from "@/types/smartReport";

import { type EnabledFilter, type ScheduleFilter, SmartReportList } from "./SmartReportList";
import {
  deriveReportStatusFromHistory,
  formatLastRunDisplay,
  indexLatestHistoryByReportId,
  type ReportRow,
} from "./smart-report/formatters";

const SMART_REPORT_PAGE_SIZE = 20;
// Latest-run enrichment only scans the most recent N history records. Reports whose
// last run falls outside this window show "Never" until their next run — acceptable
// for the list badge; the drawer always fetches per-report history for accuracy.
const REPORT_HISTORY_ENRICHMENT_LIMIT = 100;
const SMART_REPORT_DRAWER_HISTORY_LIMIT = 20;

const SmartReport: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { message } = useAppFeedback();
  const [reports, setReports] = useState<Report[]>([]);
  const [enrichmentHistory, setEnrichmentHistory] = useState<DownloadHistoryRecord[]>([]);
  const [drawerDownloads, setDrawerDownloads] = useState<DownloadHistoryRecord[]>([]);
  const [drawerHistoryTotal, setDrawerHistoryTotal] = useState(0);
  const [drawerPage, setDrawerPage] = useState(1);
  const [drawerPageSize, setDrawerPageSize] = useState(SMART_REPORT_DRAWER_HISTORY_LIMIT);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPageSize, setReportsPageSize] = useState(SMART_REPORT_PAGE_SIZE);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const messageRef = useRef(message);
  messageRef.current = message;
  const isInitialReportsLoadRef = useRef(true);
  const drawerRequestReportIdRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setReportsPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const fetchEnrichmentHistory = useCallback(async (signal?: AbortSignal) => {
    try {
      const enrichRes = await listHistory({ page: 1, limit: REPORT_HISTORY_ENRICHMENT_LIMIT });
      if (signal?.aborted) return;
      setEnrichmentHistory(enrichRes.data);
    } catch (err) {
      if (signal?.aborted) return;
      messageRef.current.error(apiErrorMessage(err, "Failed to load report run history"));
    }
  }, []);

  const fetchReports = useCallback(
    async (signal?: AbortSignal) => {
      setReportsLoading(true);
      try {
        const reportsRes = await listReports({
          page: reportsPage,
          limit: reportsPageSize,
          q: debouncedSearch.trim() || undefined,
          enabled: enabledFilter === "all" ? undefined : enabledFilter === "enabled",
          schedule: scheduleFilter === "all" ? undefined : scheduleFilter,
        });
        if (signal?.aborted) return;
        setReports(reportsRes.data);
        setReportsTotal(reportsRes.pagination.total);
      } catch (err) {
        if (signal?.aborted) return;
        messageRef.current.error(apiErrorMessage(err, "Failed to load reports"));
      } finally {
        if (!signal?.aborted) setReportsLoading(false);
      }
    },
    [reportsPage, reportsPageSize, debouncedSearch, enabledFilter, scheduleFilter],
  );

  const refresh = useCallback(() => {
    void fetchEnrichmentHistory();
    void fetchReports();
  }, [fetchEnrichmentHistory, fetchReports]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    if (isInitialReportsLoadRef.current) {
      isInitialReportsLoadRef.current = false;
      void Promise.all([fetchEnrichmentHistory(signal), fetchReports(signal)]);
    } else {
      void fetchReports(signal);
    }

    return () => controller.abort();
  }, [fetchEnrichmentHistory, fetchReports]);

  const handleReportsPaginationChange = useCallback((pageIndex: number, pageSize: number) => {
    setReportsPage(pageIndex + 1);
    setReportsPageSize(pageSize);
  }, []);

  const latestRunByReportId = useMemo(() => indexLatestHistoryByReportId(enrichmentHistory), [enrichmentHistory]);

  const reportRows: ReportRow[] = useMemo(() => {
    return reports.map((report) => {
      const latest = latestRunByReportId.get(report.id);
      return {
        ...report,
        derivedStatus: latest ? deriveReportStatusFromHistory(latest.status) : "idle",
        lastRun: formatLastRunDisplay(latest?.finishedAt ?? latest?.startedAt ?? null),
      };
    });
  }, [reports, latestRunByReportId]);

  const loadDrawerHistory = useCallback(
    async (reportId: string, page = 1, limit = SMART_REPORT_DRAWER_HISTORY_LIMIT) => {
      drawerRequestReportIdRef.current = reportId;
      setDrawerLoading(true);
      try {
        const response = await listHistory({
          page,
          limit,
          reportId,
        });
        // Ignore responses for a report the user has since navigated away from.
        if (drawerRequestReportIdRef.current !== reportId) return;
        setDrawerDownloads(response.data);
        setDrawerHistoryTotal(response.pagination.total);
      } catch (err) {
        if (drawerRequestReportIdRef.current !== reportId) return;
        messageRef.current.error(apiErrorMessage(err, "Failed to load report history"));
      } finally {
        if (drawerRequestReportIdRef.current === reportId) setDrawerLoading(false);
      }
    },
    [],
  );

  const handleDrawerPaginationChange = useCallback(
    (pageIndex: number, pageSize: number) => {
      const nextPage = pageIndex + 1;
      setDrawerPage(nextPage);
      setDrawerPageSize(pageSize);
      if (selectedReportId) {
        void loadDrawerHistory(selectedReportId, nextPage, pageSize);
      }
    },
    [loadDrawerHistory, selectedReportId],
  );

  const handleRunReport = async (report: Report) => {
    setRunningId(report.id);
    const toastId = toast.loading(`Running report "${report.name}"...`);
    try {
      const record = await runReport(report.id);
      refresh();
      if (isDrawerOpen && selectedReportId === report.id) {
        void loadDrawerHistory(report.id, drawerPage, drawerPageSize);
      }
      if (record.status === "success") {
        toast.success(`Report "${report.name}" generated and saved successfully`, { id: toastId });
      } else {
        toast.error(`Failed to run report "${report.name}". Please try again or contact support.`, { id: toastId });
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to run report"), { id: toastId });
    } finally {
      setRunningId(null);
    }
  };

  const handleDeleteReport = async (report: Report) => {
    try {
      await deleteReport(report.id, buildEtagFromUpdDate(report.upd_date));
      message.success("Report deleted successfully");
      refresh();
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to delete report"));
    }
  };

  const handleViewFiles = async (reportId: string) => {
    setSelectedReportId(reportId);
    setIsDrawerOpen(true);
    setDrawerPage(1);
    setDrawerPageSize(SMART_REPORT_DRAWER_HISTORY_LIMIT);
    setDrawerDownloads([]);
    setDrawerHistoryTotal(0);
    await loadDrawerHistory(reportId, 1, SMART_REPORT_DRAWER_HISTORY_LIMIT);
  };

  const handleDownload = async (record: DownloadHistoryRecord) => {
    if (!record.fileName) return;
    try {
      await downloadReportFile(record.id, record.fileName);
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to download file"));
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) ?? null;

  return (
    <SmartReportList
      isMobile={isMobile}
      reportRows={reportRows}
      reportsPage={reportsPage}
      reportsPageSize={reportsPageSize}
      reportsTotal={reportsTotal}
      onReportsPaginationChange={handleReportsPaginationChange}
      reportsLoading={reportsLoading}
      searchValue={rawSearch}
      onSearchChange={setRawSearch}
      enabledFilter={enabledFilter}
      onEnabledFilterChange={(value) => {
        setEnabledFilter(value);
        setReportsPage(1);
      }}
      scheduleFilter={scheduleFilter}
      onScheduleFilterChange={(value) => {
        setScheduleFilter(value);
        setReportsPage(1);
      }}
      runningId={runningId}
      isDrawerOpen={isDrawerOpen}
      onDrawerOpenChange={setIsDrawerOpen}
      drawerLoading={drawerLoading}
      selectedReport={selectedReport}
      selectedReportDownloads={drawerDownloads}
      drawerHistoryTotal={drawerHistoryTotal}
      drawerPage={drawerPage}
      drawerPageSize={drawerPageSize}
      onDrawerPaginationChange={handleDrawerPaginationChange}
      onCreateNew={() => navigate("/smart-reports/new")}
      onRunReport={(report) => void handleRunReport(report)}
      onEditReport={(report) => navigate(`/smart-reports/${report.id}/edit`)}
      onViewFiles={(reportId) => void handleViewFiles(reportId)}
      onDeleteReport={(report) => void handleDeleteReport(report)}
      onDownload={(record) => void handleDownload(record)}
    />
  );
};

export default SmartReport;
