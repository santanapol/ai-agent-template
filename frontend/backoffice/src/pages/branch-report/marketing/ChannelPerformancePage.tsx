import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Card, Divider, Form, Typography, theme } from 'antd';
import { PageContainer, PageContentCard } from '../../../components/layout';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppFeedback } from '../../../hooks/useAppFeedback';
import { apiErrorMessage } from '../../../lib/apiError';
import {
  getInviteLinks,
  getRoyalty21Times,
} from '../../../lib/branchReportApiClient';
import {
  getRoyalty21DefaultSearchValues,
  toRoyalty21QueryParams,
} from '../../../lib/branch-report/royalty21DateRange';
import type { InviteLinkItem, Royalty21QueryParams, Royalty21Row } from '../../../types/branchReport';
import Royalty21SearchForm, {
  type Royalty21SearchValues,
} from '../../../components/branch-report/marketing/Royalty21SearchForm';
import Royalty21Table from '../../../components/branch-report/marketing/Royalty21Table';

const { Title } = Typography;

const DEFAULT_PAGE_SIZE = 50;

function isRequestAborted(err: unknown): boolean {
  return (
    axios.isCancel(err) ||
    (err instanceof DOMException && err.name === 'AbortError')
  );
}

const ChannelPerformancePage: React.FC = () => {
  const { token } = theme.useToken();
  const { user } = useAuth();
  const { message } = useAppFeedback();
  const [form] = Form.useForm<Royalty21SearchValues>();

  const hasActiveBranch = Boolean(user?.branch_id);
  const channelType = Form.useWatch('channelType', form) ?? 'affiliate_link';

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
    form.setFieldsValue(getRoyalty21DefaultSearchValues());
    resetReportState();
  }, [form, resetReportState]);

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
      if (nextBranchId) {
        /* eslint-disable react-hooks/set-state-in-effect -- branch switch resets report state */
        setShowBranchSwitchNotice(true);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
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
      const links = await getInviteLinks(controller.signal);
      if (controller.signal.aborted) return;
      setInviteLinks(links);
    } catch (err: unknown) {
      if (isRequestAborted(err)) return;
      message.error(apiErrorMessage(err, 'Failed to load affiliate links'));
      setInviteLinks([]);
    } finally {
      if (!controller.signal.aborted) {
        setInviteLinksLoading(false);
      }
    }
  }, [hasActiveBranch, message]);

  useEffect(() => {
    if (channelType === 'affiliate_link' && hasActiveBranch) {
      /* eslint-disable react-hooks/set-state-in-effect -- load invite links when channel/branch changes */
      void loadInviteLinks();
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [channelType, hasActiveBranch, user?.branch_id, loadInviteLinks]);

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
        message.error(apiErrorMessage(err, 'Failed to load report'));
        setRows([]);
        setTotal(0);
      } finally {
        if (!controller.signal.aborted) {
          setTableLoading(false);
        }
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

  const handleClear = () => {
    resetFormAndReport();
  };

  const handleTableChange = (nextPage: number, nextPageSize: number) => {
    if (!searchParams) return;
    const params: Royalty21QueryParams = {
      ...searchParams,
      page: nextPage,
      pageSize: nextPageSize,
    };
    setSearchParams(params);
    void fetchReport(params);
  };

  const inviteLinkOptions = useMemo(
    () =>
      inviteLinks.map((link) => ({
        value: link.id,
        label: `${link.inviteCode} — ${link.username}`,
      })),
    [inviteLinks],
  );

  return (
    <PageContainer
      title="Channel Performance"
      description="Analyze and query Royalty 21 performance marketing statistics by channels."
      breadcrumbItems={[
        { title: 'Branch Report' },
        { title: 'Marketing' },
        { title: 'Channel Performance' },
      ]}
    >
      <PageContentCard
        title={
          <Typography.Title level={4} style={{ margin: 0 }}>
            Royalty 21 Times
          </Typography.Title>
        }
      >
        {!hasActiveBranch && (
          <Alert
            type="warning"
            showIcon
            title="Please select a branch from the top navigation"
            style={{ marginBottom: token.marginMD }}
          />
        )}

        {showBranchSwitchNotice && hasActiveBranch && (
          <Alert
            type="info"
            showIcon
            closable
            title="Branch changed — please search again to refresh this report"
            style={{ marginBottom: token.marginMD }}
            onClose={() => setShowBranchSwitchNotice(false)}
          />
        )}

        <Royalty21SearchForm
          form={form}
          inviteLinkOptions={inviteLinkOptions}
          inviteLinksLoading={inviteLinksLoading}
          tableLoading={tableLoading}
          disabled={!hasActiveBranch}
          onSearch={handleSearch}
          onClear={handleClear}
        />

        <Divider style={{ margin: `${token.marginLG}px 0` }} />

        <Royalty21Table
          rows={rows}
          loading={tableLoading}
          hasSearched={hasSearched}
          page={page}
          pageSize={pageSize}
          total={total}
          onTableChange={handleTableChange}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default ChannelPerformancePage;
