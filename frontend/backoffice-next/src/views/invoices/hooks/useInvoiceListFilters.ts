import { useEffect, useRef, useState } from "react";

import dayjs from "dayjs";

import { useSearchParams } from "@/navigation/compat";
import type { InvoiceStatus } from "@/types/invoice";

import { buildInvoiceListSearchParams, INVOICE_BRANCH_FILTER_ALL } from "../utils";

export function useInvoiceListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  const [searchText, setSearchText] = useState(searchParams.get("search") ?? "");
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(() => {
    const fromUrl = searchParams.get("branch_id");
    if (!fromUrl || fromUrl === INVOICE_BRANCH_FILTER_ALL) return undefined;
    return fromUrl;
  });
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | undefined>(
    (searchParams.get("status") as InvoiceStatus | null) ?? undefined,
  );
  const [billingMonth, setBillingMonth] = useState(
    () => searchParams.get("billing_month") ?? dayjs().format("YYYY-MM"),
  );
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get("page_size")) || 10);

  useEffect(() => {
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
    if (next.toString() === searchParams.toString()) return;
    setSearchParamsRef.current(next, { replace: true });
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
