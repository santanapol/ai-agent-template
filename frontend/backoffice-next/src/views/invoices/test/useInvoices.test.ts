import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../../../lib/invoicesApiClient";
import type { InvoiceAgentBranch } from "../../../types/invoice";
import { __resetInvoiceAgentsInflightForTests, useInvoices } from "../hooks/useInvoices";

vi.mock("../../../lib/invoicesApiClient");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("useInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetInvoiceAgentsInflightForTests();
  });

  it("should dedupe concurrent fetchInvoiceAgents calls", async () => {
    const mockBranches = [{ branch_id: "br1", branch_name: "Vegas", branch_code: "VS" }];
    let resolveAgents: (value: Awaited<ReturnType<typeof api.listInvoiceAgents>>) => void;
    const agentsPromise = new Promise<Awaited<ReturnType<typeof api.listInvoiceAgents>>>((resolve) => {
      resolveAgents = resolve;
    });
    vi.mocked(api.listInvoiceAgents).mockReturnValueOnce(agentsPromise);

    const { result } = renderHook(() => useInvoices());

    let first: Promise<InvoiceAgentBranch[]>;
    let second: Promise<InvoiceAgentBranch[]>;
    await act(async () => {
      first = result.current.fetchInvoiceAgents();
      second = result.current.fetchInvoiceAgents();
    });

    resolveAgents!({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: mockBranches,
    });

    await act(async () => {
      await Promise.all([first!, second!]);
    });

    expect(api.listInvoiceAgents).toHaveBeenCalledTimes(1);
    expect(result.current.branches).toEqual(mockBranches);
  });

  it("should fetch invoice agent branches", async () => {
    const mockBranches = [{ branch_id: "br1", branch_name: "Vegas", branch_code: "VS" }];
    vi.mocked(api.listInvoiceAgents).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: mockBranches,
    });

    const { result } = renderHook(() => useInvoices());

    await act(async () => {
      await result.current.fetchInvoiceAgents();
    });

    expect(result.current.branches).toEqual(mockBranches);
    expect(api.listInvoiceAgents).toHaveBeenCalled();
  });

  it("should fetch invoices and update state", async () => {
    const mockItems = [
      {
        _id: "inv1",
        ou_id: "ou1",
        branch_id: "br1",
        iv_no: "IV-001",
        bet: 10000,
        net_win: 1000,
        amount: 100,
        status: "READY",
        cr_date: "2025-01-01T00:00:00.000Z",
      },
    ];
    vi.mocked(api.listInvoices).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: {
        items: mockItems,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });

    const { result } = renderHook(() => useInvoices());

    await act(async () => {
      await result.current.fetchInvoices({ page: 1, limit: 10 });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.invoices).toEqual(mockItems);
    expect(result.current.total).toBe(1);
    expect(api.listInvoices).toHaveBeenCalledWith({ page: 1, limit: 10 }, undefined);
  });

  it("should fetch invoice detail and transactions", async () => {
    const mockInvoice = {
      _id: "inv1",
      ou_id: "ou1",
      branch_id: "br1",
      iv_no: "IV-001",
      bet: 10000,
      net_win: 1000,
      amount: 100,
      status: "READY",
      cr_date: "2025-01-01T00:00:00.000Z",
    };
    const mockTxns = [
      {
        _id: "tx1",
        ref_iv_id: "inv1",
        ou_id: "ou1",
        branch_id: "br1",
        company_id: "c1",
        main_category_id: "m1",
        bet: 5000,
        net_win: 500,
        fee: 10,
        amount: 50,
        cr_date: "2025-01-01T00:00:00.000Z",
      },
    ];

    vi.mocked(api.getInvoiceById).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: mockInvoice,
    });
    vi.mocked(api.listInvoiceTransactions).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: mockTxns,
    });

    const { result } = renderHook(() => useInvoices());

    await act(async () => {
      await result.current.fetchInvoiceDetail("inv1");
      await result.current.fetchTransactions("inv1");
    });

    expect(result.current.invoice).toEqual(mockInvoice);
    expect(result.current.transactions).toEqual(mockTxns);
  });

  it("should mark invoice as PAID", async () => {
    const mockInvoice = {
      _id: "inv1",
      ou_id: "ou1",
      branch_id: "br1",
      iv_no: "IV-001",
      bet: 10000,
      net_win: 1000,
      amount: 100,
      status: "READY",
      cr_date: "2025-01-01T00:00:00.000Z",
      upd_date: "2025-01-01T00:00:00.000Z",
    };

    const paidInvoice = {
      ...mockInvoice,
      status: "PAID",
    };

    vi.mocked(api.getInvoiceById).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: mockInvoice,
    });

    vi.mocked(api.updateInvoiceStatus).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: paidInvoice,
    });

    const { result } = renderHook(() => useInvoices());

    await act(async () => {
      await result.current.fetchInvoiceDetail("inv1");
    });

    await act(async () => {
      const ok = await result.current.markAsPaid("inv1");
      expect(ok).toBe(true);
    });

    expect(result.current.invoice).toEqual(paidInvoice);
    const expectedEtag = `W/"${btoa(mockInvoice.upd_date)}"`;
    expect(api.updateInvoiceStatus).toHaveBeenCalledWith("inv1", "PAID", expectedEtag);
  });

  it("should cancel invoice", async () => {
    const mockInvoice = {
      _id: "inv1",
      ou_id: "ou1",
      branch_id: "br1",
      iv_no: "IV-001",
      bet: 10000,
      net_win: 1000,
      amount: 100,
      status: "READY",
      cr_date: "2025-01-01T00:00:00.000Z",
      upd_date: "2025-01-01T00:00:00.000Z",
    };

    const cancelledInvoice = {
      ...mockInvoice,
      status: "VOID",
    };

    vi.mocked(api.getInvoiceById).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: mockInvoice,
    });

    vi.mocked(api.updateInvoiceStatus).mockResolvedValueOnce({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: cancelledInvoice,
    });

    const { result } = renderHook(() => useInvoices());

    await act(async () => {
      await result.current.fetchInvoiceDetail("inv1");
    });

    await act(async () => {
      const ok = await result.current.cancelInvoice("inv1");
      expect(ok).toBe(true);
    });

    expect(result.current.invoice).toEqual(cancelledInvoice);
    const expectedEtag = `W/"${btoa(mockInvoice.upd_date)}"`;
    expect(api.updateInvoiceStatus).toHaveBeenCalledWith("inv1", "VOID", expectedEtag);
  });
});
