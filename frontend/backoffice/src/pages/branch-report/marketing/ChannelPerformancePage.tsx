import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Breadcrumb, Card, Form, Typography, theme } from 'antd';
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

const BRANCH_SWITCH_NOTICE_MS = 2000;
const DEFAULT_PAGE_SIZE = 50;

function isRequestAborted(err: unknown): boolean {
  return (
    axios.isCancel(err) ||
    (err instanceof DOMException && err.name === 'AbortError')
  );
}

const ChannelPerformancePage: React.FC = () => {
  const { token } = theme.useToken();
  const { user, lastBranchSwitchAt } = useAuth();
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

  const [inviteLinks, setInviteLinks] = useState<InviteLinkItem[]>([]);
  const [inviteLinksLoading, setInviteLinksLoading] = useState(false);

  const reportAbortRef = useRef<AbortController | null>(null);
  const inviteAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (
      lastBranchSwitchAt &&
      Date.now() - lastBranchSwitchAt < BRANCH_SWITCH_NOTICE_MS
    ) {
      message.info('Branch changed — please search again');
    }
  }, [lastBranchSwitchAt, message]);

  useEffect(() => {
    reportAbortRef.current?.abort();
    inviteAbortRef.current?.abort();

    resetFormAndReport();
    setInviteLinks([]);
  }, [user?.branch_id, resetFormAndReport]);

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
      void loadInviteLinks();
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
    <>
      <Breadcrumb
        style={{ marginBottom: token.marginMD }}
        items={[
          { title: 'Branch Report' },
          { title: 'Marketing' },
          { title: 'Channel Performance' },
        ]}
      />
      <Card
        bordered={false}
        title={
          <Title level={4} style={{ margin: 0 }}>
            Royalty 21 Times
          </Title>
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

        <Royalty21SearchForm
          form={form}
          inviteLinkOptions={inviteLinkOptions}
          inviteLinksLoading={inviteLinksLoading}
          tableLoading={tableLoading}
          disabled={!hasActiveBranch}
          onSearch={handleSearch}
          onClear={handleClear}
        />

        <Royalty21Table
          rows={rows}
          loading={tableLoading}
          hasSearched={hasSearched}
          page={page}
          pageSize={pageSize}
          total={total}
          onTableChange={handleTableChange}
        />
      </Card>
    </>
  );
};

export default ChannelPerformancePage;
