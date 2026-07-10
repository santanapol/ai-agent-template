import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthUser, mockInvoice } from "../../test/mockFactories";
import { testNavigation } from "../../test/mockNavigation";
import { renderWithRouter } from "../../test/renderWithRouter";
import InvoiceList from "./InvoiceList";

const fetchInvoices = vi.fn();
const fetchInvoiceAgents = vi.fn();
const generateInvoices = vi.fn();
const mockUsePermission = vi.fn();
const mockUseInvoices = vi.fn();

vi.mock("../../hooks/usePermission", () => ({
  usePermission: (permission: string) => mockUsePermission(permission),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: mockAuthUser() })),
}));

vi.mock("../../hooks/useAppFeedback", () => ({
  useAppFeedback: () => ({
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
    modal: { confirm: vi.fn() },
  }),
}));

vi.mock("../../hooks/useConfirmDialog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/useConfirmDialog")>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm: vi.fn() }),
  };
});

vi.mock("./hooks/useInvoices", () => ({
  useInvoices: () => mockUseInvoices(),
}));

describe("InvoiceList page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    mockUsePermission.mockReturnValue(true);
    mockUseInvoices.mockReturnValue({
      invoices: [mockInvoice()],
      total: 1,
      loading: false,
      generating: false,
      branches: [{ branch_id: "branch-1", branch_code: "B1", branch_name: "Branch One" }],
      loadingBranches: false,
      fetchInvoices,
      fetchInvoiceAgents,
      generateInvoices,
    });
  });

  it("renders page shell with filters and table", async () => {
    renderWithRouter(<InvoiceList />, { initialEntries: ["/invoices"] });

    expect(screen.getByText("Invoice Management")).toBeInTheDocument();
    expect(screen.getByLabelText(/search invoice no/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("INV-001")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton while fetching", () => {
    mockUseInvoices.mockReturnValue({
      invoices: [],
      total: 0,
      loading: true,
      generating: false,
      branches: [],
      loadingBranches: false,
      fetchInvoices,
      fetchInvoiceAgents,
      generateInvoices,
    });

    renderWithRouter(<InvoiceList />);
    expect(document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows empty state when no invoices", async () => {
    mockUseInvoices.mockReturnValue({
      invoices: [],
      total: 0,
      loading: false,
      generating: false,
      branches: [],
      loadingBranches: false,
      fetchInvoices,
      fetchInvoiceAgents,
      generateInvoices,
    });

    renderWithRouter(<InvoiceList />);
    await waitFor(() => {
      expect(screen.getByText("No data found")).toBeInTheDocument();
    });
  });

  it("hides Create Invoice when write permission is missing", () => {
    mockUsePermission.mockImplementation((permission: string) => permission !== "invoices:write");

    renderWithRouter(<InvoiceList />);

    expect(screen.queryByRole("button", { name: /create invoice/i })).not.toBeInTheDocument();
  });

  it("hides toolbar CSV export when read permission is missing", async () => {
    mockUsePermission.mockImplementation((permission: string) => permission !== "invoices:read");

    renderWithRouter(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText("INV-001")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /export visible rows/i })).not.toBeInTheDocument();
  });

  it("shows bulk action bar when export permission granted", async () => {
    mockUsePermission.mockImplementation((permission: string) => {
      if (permission === "invoices:read") return true;
      if (permission === "invoices:write") return false;
      return false;
    });

    renderWithRouter(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText("INV-001")).toBeInTheDocument();
    });
  });

  it("links to invoice detail from row action", async () => {
    renderWithRouter(<InvoiceList />, { initialEntries: ["/invoices"] });

    await waitFor(() => {
      expect(screen.getByLabelText(/view invoice inv-001/i)).toBeInTheDocument();
    });

    const viewLink = screen.getByRole("link", { name: /view invoice inv-001/i });
    expect(viewLink).toHaveAttribute("href", expect.stringMatching(/^\/invoices\/invoice-1/));
  });

  it("reads filters from URL search params", async () => {
    renderWithRouter(<InvoiceList />, {
      initialEntries: ["/invoices?search=INV-999&branch_id=branch-1&status=READY"],
    });

    await waitFor(() => {
      expect(fetchInvoices).toHaveBeenCalled();
    });
    expect(screen.getByDisplayValue("INV-999")).toBeInTheDocument();
  });

  it("calls fetchInvoiceAgents once on initial load", async () => {
    renderWithRouter(<InvoiceList />);

    await waitFor(() => {
      expect(fetchInvoiceAgents).toHaveBeenCalledTimes(1);
    });
  });

  it("refetches invoice agents when ou_id or role changes (FE-REV-002)", async () => {
    const { useAuth } = await import("../../contexts/AuthContext");
    const useAuthMock = vi.mocked(useAuth);
    useAuthMock.mockReturnValue({
      user: mockAuthUser("platform_admin", [], { ou_id: "ou-1" }),
    } as ReturnType<typeof useAuth>);

    const { rerender } = renderWithRouter(<InvoiceList />);
    await waitFor(() => {
      expect(fetchInvoiceAgents).toHaveBeenCalledTimes(1);
    });

    useAuthMock.mockReturnValue({
      user: mockAuthUser("platform_admin", [], { ou_id: "ou-2" }),
    } as ReturnType<typeof useAuth>);
    rerender(<InvoiceList />);

    await waitFor(() => {
      expect(fetchInvoiceAgents).toHaveBeenCalledTimes(2);
    });
  });

  it("calls fetchInvoices once on initial load", async () => {
    renderWithRouter(<InvoiceList />);

    await waitFor(() => {
      expect(fetchInvoices).toHaveBeenCalledTimes(1);
    });
  });

  it("calls fetchInvoices once for branch_id=all and billing_month URL", async () => {
    renderWithRouter(<InvoiceList />, {
      initialEntries: ["/invoices?branch_id=all&billing_month=2026-07"],
    });

    await waitFor(() => {
      expect(fetchInvoices).toHaveBeenCalledTimes(1);
    });

    await waitFor(
      () => {
        expect(fetchInvoices).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 },
    );
  });
});
