import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route, Routes } from "@/navigation/compat";

import { renderWithRouter } from "../../test/renderWithRouter";

const confirm = vi.fn();
const fetchInvoiceDetail = vi.fn();
const fetchTransactions = vi.fn();
const markAsPaid = vi.fn().mockResolvedValue(true);
const cancelInvoice = vi.fn().mockResolvedValue(true);
const mockUseInvoices = vi.fn();

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

vi.mock("@/hooks/useConfirmDialog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useConfirmDialog")>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm }),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { branch_id: "branch-1" } }),
}));

vi.mock("./hooks/useInvoices", () => ({
  useInvoices: () => mockUseInvoices(),
}));

import InvoiceDetail from "./InvoiceDetail";

const defaultInvoiceState = {
  invoice: {
    _id: "invoice-1",
    iv_no: "INV-001",
    status: "READY",
    amount: 1234,
    billing_month: "2026-07",
    cr_date: "2026-07-01",
    due_date: "2026-07-15",
    branch_name: "Branch One",
    upd_date: "2026-07-01",
  },
  transactions: [],
  detailLoading: false,
  transactionsLoading: false,
  updatingStatus: false,
  fetchInvoiceDetail,
  fetchTransactions,
  markAsPaid,
  cancelInvoice,
};

function renderInvoiceDetail() {
  return renderWithRouter(
    <Routes>
      <Route path="/invoices/:id" element={<InvoiceDetail />} />
    </Routes>,
    { initialEntries: ["/invoices/invoice-1"] },
  );
}

describe("InvoiceDetail", () => {
  beforeEach(() => {
    confirm.mockClear();
    fetchInvoiceDetail.mockClear();
    fetchTransactions.mockClear();
    markAsPaid.mockClear();
    cancelInvoice.mockClear();
    mockUseInvoices.mockReturnValue(defaultInvoiceState);
  });

  it("shows loading skeleton while detail is loading", () => {
    mockUseInvoices.mockReturnValue({
      ...defaultInvoiceState,
      invoice: null,
      detailLoading: true,
    });

    renderInvoiceDetail();
    expect(document.querySelector('[aria-busy="true"], .animate-pulse')).toBeTruthy();
  });

  it("shows not found state when invoice is missing after load", () => {
    mockUseInvoices.mockReturnValue({
      ...defaultInvoiceState,
      invoice: null,
      detailLoading: false,
    });

    renderInvoiceDetail();
    expect(screen.getByRole("heading", { name: /invoice not found/i })).toBeInTheDocument();
  });

  it("renders invoice number in the page title", () => {
    renderInvoiceDetail();
    expect(screen.getByRole("heading", { name: /invoice details: #inv-001/i })).toBeInTheDocument();
  });

  it("navigates back to invoices list when back is clicked", async () => {
    const user = userEvent.setup();

    renderWithRouter(
      <Routes>
        <Route path="/invoices" element={<div>Invoices list</div>} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
      </Routes>,
      { initialEntries: ["/invoices/invoice-1"] },
    );

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Invoices list")).toBeInTheDocument();
  });

  it("confirms before marking an invoice as paid", async () => {
    const user = userEvent.setup();

    renderInvoiceDetail();

    await user.click(screen.getByRole("button", { name: /mark as paid/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Mark as PAID",
        okText: "Mark as PAID",
      }),
    );

    await confirm.mock.calls[0][0].onOk();
    expect(markAsPaid).toHaveBeenCalledWith("invoice-1");
    expect(fetchInvoiceDetail).toHaveBeenCalledWith("invoice-1");
  });

  it("confirms before canceling an invoice", async () => {
    const user = userEvent.setup();

    renderInvoiceDetail();

    await user.click(screen.getByRole("button", { name: /cancel invoice/i }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cancel Invoice",
        danger: true,
        okText: "Cancel Invoice",
      }),
    );

    await confirm.mock.calls[0][0].onOk();
    expect(cancelInvoice).toHaveBeenCalledWith("invoice-1");
    expect(fetchInvoiceDetail).toHaveBeenCalledWith("invoice-1");
  });
});
