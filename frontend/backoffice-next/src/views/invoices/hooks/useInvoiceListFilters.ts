import { useEffect, useRef, useState } from "react";

import { useSearchParams } from "@/navigation/compat";
import type { InvoiceStatus } from "@/types/invoice";

import { buildInvoiceListSearchParams, parseInvoiceListSearchParams } from "../utils";

export function useInvoiceListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  const initial = parseInvoiceListSearchParams(searchParams);
  const lastWrittenQueryRef = useRef(searchParams.toString());
  const skipDebounceRef = useRef(false);

  const [searchText, setSearchText] = useState(initial.searchText);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(initial.selectedBranchId);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | undefined>(initial.selectedStatus);
  const [billingMonth, setBillingMonth] = useState(initial.billingMonth);
  const [debouncedSearchText, setDebouncedSearchText] = useState(initial.searchText);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (currentQuery === lastWrittenQueryRef.current) return;

    const parsed = parseInvoiceListSearchParams(searchParams);
    skipDebounceRef.current = true;
    setSearchText(parsed.searchText);
    setDebouncedSearchText(parsed.searchText);
    setSelectedBranchId(parsed.selectedBranchId);
    setSelectedStatus(parsed.selectedStatus);
    setBillingMonth(parsed.billingMonth);
    setPage(parsed.page);
    setPageSize(parsed.pageSize);
    lastWrittenQueryRef.current = currentQuery;
  }, [searchParams]);

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    const timeoutId = window.setTimeout(() => setDebouncedSearchText(searchText), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  useEffect(() => {
    const next = buildInvoiceListSearchParams({
      searchText,
      selectedBranchId,
      selectedStatus,
      billingMonth,
      page,
      pageSize,
    });
    const nextQuery = next.toString();
    lastWrittenQueryRef.current = nextQuery;
    if (nextQuery !== searchParams.toString()) {
      setSearchParamsRef.current(next, { replace: true });
    }
  }, [searchText, selectedBranchId, selectedStatus, billingMonth, page, pageSize, searchParams]);

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
  };
}
