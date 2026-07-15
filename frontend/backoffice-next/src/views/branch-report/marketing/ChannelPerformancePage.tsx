"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import axios from "axios";
import dayjs from "dayjs";

import DepositMatrixTable from "@/components/branch-report/marketing/DepositMatrixTable";
import Royalty21SearchForm, {
  type Royalty21SearchValues,
} from "@/components/branch-report/marketing/Royalty21SearchForm";
import Royalty21Table from "@/components/branch-report/marketing/Royalty21Table";
import { createRoyalty21Columns } from "@/components/branch-report/marketing/royalty21Columns";
import { DataTableToolbarActions, useServerDataTable } from "@/components/data-table";
import { ListPageCard } from "@/components/layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import {
  clearPersistedChannelPerformanceSearch,
  paramsForBranchSwitchRefetch,
  persistChannelPerformanceSearch,
  readPersistedChannelPerformanceSearch,
} from "@/lib/branch-report/channelPerformanceSearchPersist";
import { exportDepositMatrixToCsv, exportDepositMatrixToXlsx } from "@/lib/branch-report/depositMatrixExport";
import { INVITE_LINKS_FULL_LIST_LIMIT, INVITE_LINKS_SEARCH_LIMIT } from "@/lib/branch-report/inviteLinksLimits";
import { toRoyalty21QueryParams } from "@/lib/branch-report/royalty21DateRange";
import { getDepositMatrix, getInviteLinks, getRoyalty21Times } from "@/lib/branchReportApiClient";
import type {
  DepositMatrixData,
  DepositMatrixQueryParams,
  InviteLinkItem,
  Royalty21QueryParams,
  Royalty21Row,
} from "@/types/branchReport";

const DEFAULT_PAGE_SIZE = 50;

function isRequestAborted(err: unknown): boolean {
  return axios.isCancel(err) || (err instanceof DOMException && err.name === "AbortError");
}

function needsBranchScopedReselect(channelType: Royalty21QueryParams["channelType"]): boolean {
  return channelType === "affiliate_link";
}

function toDepositMatrixParams(params: Royalty21QueryParams): DepositMatrixQueryParams {
  const { page: _page, pageSize: _pageSize, ...rest } = params;
  return rest;
}

const ChannelPerformancePage: React.FC = () => {
  const { user, lastBranchSwitchAt } = useAuth();
  const { message } = useAppFeedback();
  const hasActiveBranch = Boolean(user?.branch_id);

  const [hasSearched, setHasSearched] = useState(false);
  const [rows, setRows] = useState<Royalty21Row[]>([]);
  const [matrix, setMatrix] = useState<DepositMatrixData | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useState<Royalty21QueryParams | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<Partial<Royalty21SearchValues> | undefined>();
  const [showBranchSwitchNotice, setShowBranchSwitchNotice] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLinkItem[]>([]);
  const [inviteLinksLoading, setInviteLinksLoading] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [activeTab, setActiveTab] = useState("member-detail");

  const reportAbortRef = useRef<AbortController | null>(null);
  const inviteAbortRef = useRef<AbortController | null>(null);
  const handledBranchSwitchAtRef = useRef<number | null>(null);
  const inviteLinksForBranchRef = useRef<string | undefined>(undefined);
  const inviteLinkSearchDebounceRef = useRef<number | undefined>(undefined);
  const [inviteLinkSearchQuery, setInviteLinkSearchQuery] = useState("");

  const resetReportState = useCallback(() => {
    clearPersistedChannelPerformanceSearch();
    setHasSearched(false);
    setRows([]);
    setMatrix(null);
    setTotal(0);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSearchParams(null);
    setFormInitialValues(undefined);
    setShowBranchSwitchNotice(false);
    setActiveTab("member-detail");
  }, []);

  const resetForBranchChange = useCallback(() => {
    reportAbortRef.current?.abort();
    inviteAbortRef.current?.abort();
    resetReportState();
    setInviteLinks([]);
    setInviteLinkSearchQuery("");
  }, [resetReportState]);

  useEffect(
    () => () => {
      reportAbortRef.current?.abort();
      inviteAbortRef.current?.abort();
      if (inviteLinkSearchDebounceRef.current !== undefined) {
        window.clearTimeout(inviteLinkSearchDebounceRef.current);
      }
    },
    [],
  );

  const loadInviteLinks = useCallback(
    async (options: { q?: string; limit?: number } = {}) => {
      if (!hasActiveBranch || !user?.branch_id) {
        setInviteLinks([]);
        inviteLinksForBranchRef.current = undefined;
        return;
      }
      const q = options.q?.trim() || undefined;
      const limit = options.limit ?? (q ? INVITE_LINKS_SEARCH_LIMIT : INVITE_LINKS_FULL_LIST_LIMIT);

      inviteAbortRef.current?.abort();
      const controller = new AbortController();
      inviteAbortRef.current = controller;
      setInviteLinksLoading(true);
      try {
        const links = await getInviteLinks({ q, limit, signal: controller.signal });
        if (controller.signal.aborted) return;
        setInviteLinks(links);
        if (!q) inviteLinksForBranchRef.current = user.branch_id;
      } catch (err: unknown) {
        if (isRequestAborted(err)) return;
        message.error(apiErrorMessage(err, "Failed to load affiliate links"));
        setInviteLinks([]);
        if (!q) inviteLinksForBranchRef.current = undefined;
      } finally {
        if (inviteAbortRef.current === controller) {
          setInviteLinksLoading(false);
        }
      }
    },
    [hasActiveBranch, message, user?.branch_id],
  );

  const handleInviteLinksOpen = useCallback(() => {
    if (inviteLinksLoading) return;
    if (inviteLinksForBranchRef.current === user?.branch_id && inviteLinks.length > 0 && !inviteLinkSearchQuery) {
      return;
    }
    void loadInviteLinks({ limit: INVITE_LINKS_FULL_LIST_LIMIT });
  }, [inviteLinkSearchQuery, inviteLinks.length, inviteLinksLoading, loadInviteLinks, user?.branch_id]);

  const handleInviteLinkSearchQueryChange = useCallback(
    (query: string) => {
      setInviteLinkSearchQuery(query);
      if (inviteLinkSearchDebounceRef.current !== undefined) {
        window.clearTimeout(inviteLinkSearchDebounceRef.current);
      }
      inviteLinkSearchDebounceRef.current = window.setTimeout(() => {
        const trimmed = query.trim();
        void loadInviteLinks({
          q: trimmed || undefined,
          limit: trimmed ? INVITE_LINKS_SEARCH_LIMIT : INVITE_LINKS_FULL_LIST_LIMIT,
        });
      }, 300);
    },
    [loadInviteLinks],
  );

  const fetchMemberReport = useCallback(
    async (params: Royalty21QueryParams, signal: AbortSignal) => {
      try {
        const result = await getRoyalty21Times(params, signal);
        if (signal.aborted) return;
        setRows(result.data);
        setTotal(result.pagination.total);
        setPage(result.pagination.page);
        setPageSize(result.pagination.pageSize);
      } catch (err: unknown) {
        if (isRequestAborted(err) || signal.aborted) return;
        message.error(apiErrorMessage(err, "Failed to load report"));
        setRows([]);
        setTotal(0);
      }
    },
    [message],
  );

  const fetchMatrix = useCallback(
    async (params: Royalty21QueryParams, signal: AbortSignal) => {
      try {
        const result = await getDepositMatrix(toDepositMatrixParams(params), signal);
        if (signal.aborted) return;
        setMatrix(result);
      } catch (err: unknown) {
        if (isRequestAborted(err) || signal.aborted) return;
        message.error(apiErrorMessage(err, "Failed to load deposit matrix"));
        setMatrix(null);
      }
    },
    [message],
  );

  const fetchOnSearch = useCallback(
    async (params: Royalty21QueryParams) => {
      reportAbortRef.current?.abort();
      const controller = new AbortController();
      reportAbortRef.current = controller;
      setTableLoading(true);
      try {
        await Promise.all([fetchMemberReport(params, controller.signal), fetchMatrix(params, controller.signal)]);
      } finally {
        if (!controller.signal.aborted) setTableLoading(false);
      }
    },
    [fetchMatrix, fetchMemberReport],
  );

  const fetchMemberPage = useCallback(
    async (params: Royalty21QueryParams) => {
      reportAbortRef.current?.abort();
      const controller = new AbortController();
      reportAbortRef.current = controller;
      setTableLoading(true);
      try {
        await fetchMemberReport(params, controller.signal);
      } finally {
        if (!controller.signal.aborted) setTableLoading(false);
      }
    },
    [fetchMemberReport],
  );

  useEffect(() => {
    if (lastBranchSwitchAt == null || !hasActiveBranch) return;
    if (handledBranchSwitchAtRef.current === lastBranchSwitchAt) return;
    handledBranchSwitchAtRef.current = lastBranchSwitchAt;

    reportAbortRef.current?.abort();
    inviteAbortRef.current?.abort();
    setInviteLinks([]);
    inviteLinksForBranchRef.current = undefined;
    setInviteLinkSearchQuery("");

    const persisted = readPersistedChannelPerformanceSearch();
    if (!persisted) {
      resetForBranchChange();
      setShowBranchSwitchNotice(true);
      void loadInviteLinks({ limit: INVITE_LINKS_FULL_LIST_LIMIT });
      return;
    }

    const refetchParams = paramsForBranchSwitchRefetch(persisted.params);
    const needsReselect = needsBranchScopedReselect(refetchParams.channelType);
    const refetchValues: Royalty21SearchValues = needsReselect
      ? { ...persisted.values, inviteLinkId: undefined }
      : persisted.values;

    setShowBranchSwitchNotice(needsReselect);
    setFormInitialValues(refetchValues);
    setSearchParams(refetchParams);
    setHasSearched(!needsReselect);
    setPage(1);
    setPageSize(refetchParams.pageSize ?? DEFAULT_PAGE_SIZE);
    setMatrix(null);

    if (refetchParams.channelType === "affiliate_link") {
      setRows([]);
      setTotal(0);
      void loadInviteLinks({ limit: INVITE_LINKS_FULL_LIST_LIMIT });
      return;
    }

    void fetchOnSearch(refetchParams);
  }, [lastBranchSwitchAt, hasActiveBranch, fetchOnSearch, loadInviteLinks, resetForBranchChange]);

  const handleSearch = (values: Royalty21SearchValues) => {
    if (!hasActiveBranch) return;
    setShowBranchSwitchNotice(false);
    const params = toRoyalty21QueryParams({ ...values, page: 1, pageSize });
    setSearchParams(params);
    setFormInitialValues(values);
    setHasSearched(true);
    persistChannelPerformanceSearch(values, params);
    void fetchOnSearch(params);
  };

  const handleTableChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPage(nextPage);
      setPageSize(nextPageSize);

      if (!searchParams) return;
      if (searchParams.page === nextPage && searchParams.pageSize === nextPageSize) return;

      const params: Royalty21QueryParams = { ...searchParams, page: nextPage, pageSize: nextPageSize };
      setSearchParams(params);
      persistChannelPerformanceSearch(
        {
          channelType: params.channelType,
          inviteLinkId: params.inviteLinkId,
          referralUsername: params.referralUsername,
          regDateRange: [dayjs(params.regDateFrom), dayjs(params.regDateTo)],
        },
        params,
      );
      void fetchMemberPage(params);
    },
    [fetchMemberPage, searchParams],
  );

  const inviteLinkOptions = useMemo(
    () => inviteLinks.map((link) => ({ value: link.id, label: `${link.inviteCode} — ${link.username}` })),
    [inviteLinks],
  );

  const columns = useMemo(() => createRoyalty21Columns(), []);

  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  const table = useServerDataTable({
    data: rows,
    columns,
    pageIndex: page - 1,
    pageSize,
    pageCount,
    onPaginationChange: ({ pageIndex, pageSize: nextPageSize }) => {
      handleTableChange(pageIndex + 1, nextPageSize);
    },
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => `${row.username}::${row.register}`,
  });

  const isMemberDetailTab = activeTab === "member-detail";
  const matrixExportMode = activeTab === "deposit-percent" ? "percent" : "count";
  const exportFileName = isMemberDetailTab
    ? "channel-performance-member-detail"
    : `channel-performance-deposit-${matrixExportMode}`;

  let branchAlert: React.ReactNode = null;
  if (!hasActiveBranch) {
    branchAlert = (
      <Alert>
        <AlertTitle>Branch required</AlertTitle>
        <AlertDescription>Please select a branch from the top navigation.</AlertDescription>
      </Alert>
    );
  } else if (showBranchSwitchNotice) {
    branchAlert = (
      <Alert>
        <AlertTitle>Branch changed</AlertTitle>
        <AlertDescription>Please search again to refresh this report.</AlertDescription>
      </Alert>
    );
  }

  return (
    <ListPageCard
      title="Channel Performance"
      description="Analyze and query Royalty 21 performance marketing statistics by channels."
      descriptionClassName="max-w-2xl"
      toolbar={
        <DataTableToolbarActions
          table={table}
          exportFileName={exportFileName}
          showColumnVisibility={false}
          exportDisabled={!hasSearched || (isMemberDetailTab ? rows.length === 0 : !matrix)}
          onExportCsv={
            !isMemberDetailTab && matrix
              ? () => exportDepositMatrixToCsv(matrix, matrixExportMode, exportFileName)
              : undefined
          }
          onExportXlsx={
            !isMemberDetailTab && matrix
              ? () => exportDepositMatrixToXlsx(matrix, matrixExportMode, exportFileName)
              : undefined
          }
        />
      }
      headerAddon={branchAlert}
      filterRow={
        <Royalty21SearchForm
          key={`${user?.branch_id ?? "none"}-${lastBranchSwitchAt ?? 0}`}
          inviteLinkOptions={inviteLinkOptions}
          inviteLinksLoading={inviteLinksLoading}
          tableLoading={tableLoading}
          disabled={!hasActiveBranch}
          initialValues={formInitialValues}
          onSearch={handleSearch}
          onClear={resetReportState}
          onInviteLinksOpen={handleInviteLinksOpen}
          onInviteLinkSearchQueryChange={handleInviteLinkSearchQueryChange}
        />
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="member-detail">Member detail</TabsTrigger>
          <TabsTrigger value="deposit-count">Deposit count</TabsTrigger>
          <TabsTrigger value="deposit-percent">Deposit %</TabsTrigger>
        </TabsList>
        <TabsContent value="member-detail">
          <Royalty21Table table={table} loading={tableLoading} hasSearched={hasSearched} total={total} />
        </TabsContent>
        <TabsContent value="deposit-count">
          <DepositMatrixTable mode="count" data={matrix} hasSearched={hasSearched} loading={tableLoading} />
        </TabsContent>
        <TabsContent value="deposit-percent">
          <DepositMatrixTable mode="percent" data={matrix} hasSearched={hasSearched} loading={tableLoading} />
        </TabsContent>
      </Tabs>
    </ListPageCard>
  );
};

export default ChannelPerformancePage;
