"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VisibilityState } from "@tanstack/react-table";
import axios from "axios";

import Royalty21SearchForm, {
  type Royalty21SearchValues,
} from "@/components/branch-report/marketing/Royalty21SearchForm";
import Royalty21Table from "@/components/branch-report/marketing/Royalty21Table";
import { createRoyalty21Columns } from "@/components/branch-report/marketing/royalty21Columns";
import { DataTableToolbarActions, useServerDataTable } from "@/components/data-table";
import { ListPageCard } from "@/components/layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import { toRoyalty21QueryParams } from "@/lib/branch-report/royalty21DateRange";
import { getInviteLinks, getRoyalty21Times } from "@/lib/branchReportApiClient";
import type { InviteLinkItem, Royalty21QueryParams, Royalty21Row } from "@/types/branchReport";

const DEFAULT_PAGE_SIZE = 50;

function isRequestAborted(err: unknown): boolean {
  return axios.isCancel(err) || (err instanceof DOMException && err.name === "AbortError");
}

const ChannelPerformancePage: React.FC = () => {
  const { user } = useAuth();
  const { message } = useAppFeedback();
  const hasActiveBranch = Boolean(user?.branch_id);

  const [hasSearched, setHasSearched] = useState(false);
  const [rows, setRows] = useState<Royalty21Row[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useState<Royalty21QueryParams | null>(null);
  const [showBranchSwitchNotice, setShowBranchSwitchNotice] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<InviteLinkItem[]>([]);
  const [inviteLinksLoading, setInviteLinksLoading] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const reportAbortRef = useRef<AbortController | null>(null);
  const inviteAbortRef = useRef<AbortController | null>(null);
  const prevBranchIdRef = useRef<string | undefined>(undefined);

  const resetReportState = useCallback(() => {
    setHasSearched(false);
    setRows([]);
    setTotal(0);
    setPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
    setSearchParams(null);
  }, []);

  const resetFormAndReport = useCallback(() => {
    resetReportState();
  }, [resetReportState]);

  const resetForBranchChange = useCallback(() => {
    reportAbortRef.current?.abort();
    inviteAbortRef.current?.abort();
    resetFormAndReport();
    setInviteLinks([]);
  }, [resetFormAndReport]);

  useEffect(() => {
    const prevBranchId = prevBranchIdRef.current;
    const nextBranchId = user?.branch_id;
    if (prevBranchId !== undefined && prevBranchId !== nextBranchId) {
      if (nextBranchId) setShowBranchSwitchNotice(true);
      resetForBranchChange();
    }
    prevBranchIdRef.current = nextBranchId;
  }, [user?.branch_id, resetForBranchChange]);

  useEffect(
    () => () => {
      reportAbortRef.current?.abort();
      inviteAbortRef.current?.abort();
    },
    [],
  );

  const loadInviteLinks = useCallback(async () => {
    if (!hasActiveBranch) {
      setInviteLinks([]);
      return;
    }
    inviteAbortRef.current?.abort();
    const controller = new AbortController();
    inviteAbortRef.current = controller;
    setInviteLinksLoading(true);
    try {
      const links = await getInviteLinks({ limit: 20, signal: controller.signal });
      if (controller.signal.aborted) return;
      setInviteLinks(links);
    } catch (err: unknown) {
      if (isRequestAborted(err)) return;
      message.error(apiErrorMessage(err, "Failed to load affiliate links"));
      setInviteLinks([]);
    } finally {
      if (!controller.signal.aborted) setInviteLinksLoading(false);
    }
  }, [hasActiveBranch, message]);

  const handleInviteLinksOpen = useCallback(() => {
    if (inviteLinks.length > 0 || inviteLinksLoading) return;
    void loadInviteLinks();
  }, [inviteLinks.length, inviteLinksLoading, loadInviteLinks]);

  const fetchReport = useCallback(
    async (params: Royalty21QueryParams) => {
      reportAbortRef.current?.abort();
      const controller = new AbortController();
      reportAbortRef.current = controller;
      setTableLoading(true);
      try {
        const result = await getRoyalty21Times(params, controller.signal);
        if (controller.signal.aborted) return;
        setRows(result.data);
        setTotal(result.pagination.total);
        setPage(result.pagination.page);
        setPageSize(result.pagination.pageSize);
      } catch (err: unknown) {
        if (isRequestAborted(err)) return;
        message.error(apiErrorMessage(err, "Failed to load report"));
        setRows([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) setTableLoading(false);
      }
    },
    [message],
  );

  const handleSearch = (values: Royalty21SearchValues) => {
    if (!hasActiveBranch) return;
    setShowBranchSwitchNotice(false);
    const params = toRoyalty21QueryParams({ ...values, page: 1, pageSize });
    setSearchParams(params);
    setHasSearched(true);
    void fetchReport(params);
  };

  const handleTableChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      if (!searchParams) return;
      if (searchParams.page === nextPage && searchParams.pageSize === nextPageSize) return;
      const params: Royalty21QueryParams = { ...searchParams, page: nextPage, pageSize: nextPageSize };
      setSearchParams(params);
      void fetchReport(params);
    },
    [fetchReport, searchParams],
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

  return (
    <ListPageCard
      title="Channel Performance"
      description="Analyze and query Royalty 21 performance marketing statistics by channels."
      toolbar={<DataTableToolbarActions table={table} exportFileName="royalty21-channel-performance" showColumnVisibility={false} />}
      headerAddon={
        <>
          {!hasActiveBranch ? (
            <Alert>
              <AlertTitle>Branch required</AlertTitle>
              <AlertDescription>Please select a branch from the top navigation.</AlertDescription>
            </Alert>
          ) : null}
          {showBranchSwitchNotice && hasActiveBranch ? (
            <Alert>
              <AlertTitle>Branch changed</AlertTitle>
              <AlertDescription>Please search again to refresh this report.</AlertDescription>
            </Alert>
          ) : null}
        </>
      }
      filterRow={
        <Royalty21SearchForm
          inviteLinkOptions={inviteLinkOptions}
          inviteLinksLoading={inviteLinksLoading}
          tableLoading={tableLoading}
          disabled={!hasActiveBranch}
          onSearch={handleSearch}
          onClear={resetFormAndReport}
          onInviteLinksOpen={handleInviteLinksOpen}
        />
      }
    >
      <Royalty21Table table={table} loading={tableLoading} hasSearched={hasSearched} total={total} />
    </ListPageCard>
  );
};

export default ChannelPerformancePage;
