import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import type { InvoiceStatus } from '@/types/invoice';
import { INVOICE_BRANCH_FILTER_ALL } from '../utils';

export function useInvoiceListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get('search') ?? '');
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(() => {
    const fromUrl = searchParams.get('branch_id');
    if (!fromUrl || fromUrl === INVOICE_BRANCH_FILTER_ALL) return undefined;
    return fromUrl;
  });
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | undefined>(
    (searchParams.get('status') as InvoiceStatus | null) ?? undefined,
  );
  const [billingMonth, setBillingMonth] = useState(
    () => searchParams.get('billing_month') ?? dayjs().format('YYYY-MM'),
  );
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 10);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearchText(searchText), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchText) params.search = searchText;
    params.branch_id = selectedBranchId ?? INVOICE_BRANCH_FILTER_ALL;
    if (selectedStatus) params.status = selectedStatus;
    if (billingMonth) params.billing_month = billingMonth;
    if (page !== 1) params.page = String(page);
    if (pageSize !== 10) params.page_size = String(pageSize);
    setSearchParams(params, { replace: true });
  }, [searchText, selectedBranchId, selectedStatus, billingMonth, page, pageSize, setSearchParams]);

  const isInvoiceSearchActive = Boolean(debouncedSearchText.trim());

  return {
    searchParams,
    searchText,
    setSearchText,
    selectedBranchId,
    setSelectedBranchId,
    selectedStatus,
    setSelectedStatus,
    billingMonth,
    setBillingMonth,
    debouncedSearchText,
    page,
    setPage,
    pageSize,
    setPageSize,
    isInvoiceSearchActive,
  };
}
