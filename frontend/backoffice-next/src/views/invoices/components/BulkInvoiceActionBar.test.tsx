import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";

import { BulkInvoiceActionBar } from "./BulkInvoiceActionBar";

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: vi.fn(),
}));

const baseProps = {
  selectedCount: 2,
  canExport: true,
  canWrite: true,
  busy: false,
  onExportPdf: vi.fn(),
  onExportExcel: vi.fn(),
  onMarkPaid: vi.fn(),
  onCancelInvoices: vi.fn(),
  onClear: vi.fn(),
};

function renderBar(ui: React.ReactElement) {
  return render(<SidebarProvider defaultOpen>{ui}</SidebarProvider>);
}

describe("BulkInvoiceActionBar", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it("renders nothing when no rows are selected", () => {
    renderBar(<BulkInvoiceActionBar {...baseProps} selectedCount={0} />);
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it("hides export menu when canExport is false", () => {
    renderBar(<BulkInvoiceActionBar {...baseProps} canExport={false} />);

    expect(screen.queryByRole("button", { name: /export selected invoices/i })).not.toBeInTheDocument();
    expect(screen.getByText("Mark as PAID")).toBeInTheDocument();
  });

  it("shows status buttons only when canWrite is true", () => {
    renderBar(<BulkInvoiceActionBar {...baseProps} canWrite={false} />);

    expect(screen.queryByText("Mark as PAID")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export selected invoices/i })).toBeInTheDocument();
  });

  it("disables actions while busy", () => {
    renderBar(<BulkInvoiceActionBar {...baseProps} busy />);

    expect(screen.getByText("Mark as PAID").closest("button")).toBeDisabled();
    expect(screen.getByRole("button", { name: /export selected invoices/i })).toBeDisabled();
    expect(screen.getByText("Clear").closest("button")).toBeDisabled();
  });

  it("calls handlers when buttons are clicked", async () => {
    const user = userEvent.setup();
    const onMarkPaid = vi.fn();
    const onExportPdf = vi.fn();

    renderBar(<BulkInvoiceActionBar {...baseProps} onMarkPaid={onMarkPaid} onExportPdf={onExportPdf} />);

    await user.click(screen.getByText("Mark as PAID"));
    await user.click(screen.getByRole("button", { name: /export selected invoices/i }));
    await user.click(await screen.findByText("Export PDF"));

    expect(onMarkPaid).toHaveBeenCalledOnce();
    expect(onExportPdf).toHaveBeenCalledOnce();
  });

  it("offsets horizontally for the expanded sidebar on desktop", () => {
    renderBar(<BulkInvoiceActionBar {...baseProps} />);
    const bar = screen.getByText(/selected 2/i).parentElement?.parentElement;
    expect(bar?.className).toContain("left-[calc(50%+var(--sidebar-width)/2)]");
  });
});
