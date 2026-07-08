import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as bulkExport from "../export/bulkExport";
import { BulkExportModal } from "./BulkExportModal";

vi.mock("../export/bulkExport", () => ({
  runBulkExport: vi.fn(),
  formatBulkExportZipFilename: vi.fn(() => "invoices_export_test.zip"),
}));

vi.mock("../export/downloadBlob", () => ({
  triggerBlobDownload: vi.fn(),
}));

describe("BulkExportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows progress and clears selection when all exports succeed", async () => {
    vi.mocked(bulkExport.runBulkExport).mockImplementation(async ({ onProgress }) => {
      onProgress?.({
        done: 1,
        total: 1,
        currentIvNo: "IV-001",
        results: [{ id: "inv1", ivNo: "IV-001", status: "success" }],
      });
      return new Blob(["zip"], { type: "application/zip" });
    });

    const onClose = vi.fn();
    render(<BulkExportModal open invoiceIds={["inv1"]} format="pdf" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("IV-001")).toBeInTheDocument();
    });

    const footer = document.querySelector('[data-slot="dialog-footer"]');
    expect(footer).not.toBeNull();
    await userEvent.click(within(footer as HTMLElement).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("keeps running state until export finishes after cancel is clicked", async () => {
    let resolveExport: ((value: Blob | null) => void) | undefined;
    const exportPromise = new Promise<Blob | null>((resolve) => {
      resolveExport = resolve;
    });

    vi.mocked(bulkExport.runBulkExport).mockReturnValue(exportPromise);

    const onRunningChange = vi.fn();
    render(
      <BulkExportModal open invoiceIds={["inv1"]} format="pdf" onClose={vi.fn()} onRunningChange={onRunningChange} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    resolveExport?.(null);
    await waitFor(() => {
      expect(onRunningChange).toHaveBeenLastCalledWith(false);
    });
  });

  it("retries only failed items", async () => {
    vi.mocked(bulkExport.runBulkExport)
      .mockImplementationOnce(async ({ onProgress }) => {
        onProgress?.({
          done: 2,
          total: 2,
          results: [
            { id: "inv1", ivNo: "IV-001", status: "failed", error: "boom" },
            { id: "inv2", ivNo: "IV-002", status: "cancelled" },
          ],
        });
        return new Blob(["zip"], { type: "application/zip" });
      })
      .mockImplementationOnce(async ({ invoiceIds, onProgress }) => {
        expect(invoiceIds).toEqual(["inv1"]);
        onProgress?.({
          done: 1,
          total: 1,
          results: [{ id: "inv1", ivNo: "IV-001", status: "success" }],
        });
        return new Blob(["zip"], { type: "application/zip" });
      });

    render(<BulkExportModal open invoiceIds={["inv1", "inv2"]} format="pdf" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry failed" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Retry failed" }));

    await waitFor(() => {
      expect(bulkExport.runBulkExport).toHaveBeenCalledTimes(2);
    });
  });
});
