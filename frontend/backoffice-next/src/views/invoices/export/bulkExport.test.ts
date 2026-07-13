import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "../../../lib/invoicesApiClient";
import { runBulkExport, sanitizeInvoiceFilename } from "./bulkExport";
import { makeTestInvoice, makeTestTransaction } from "./testFixtures";
import type { BulkExportProgress } from "./types";

vi.mock("../../../lib/invoicesApiClient");

function mockBatchSuccess(
  entries: Array<{ id: string; ivNo: string; includeTransactions?: boolean }>,
) {
  vi.mocked(api.getInvoicesBatch).mockImplementation(async (ids) => {
    const items = entries
      .filter((entry) => ids.includes(entry.id))
      .map((entry) => ({
        ...makeTestInvoice({ _id: entry.id, iv_no: entry.ivNo }),
        transactions: entry.includeTransactions === false
          ? undefined
          : [makeTestTransaction({ ref_iv_id: entry.id })],
      }));

    const found = new Set(items.map((item) => item._id));
    const missing = ids.filter((id) => !found.has(id));

    return {
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: { items, missing },
    };
  });
}

describe("sanitizeInvoiceFilename", () => {
  it("replaces path separators", () => {
    expect(sanitizeInvoiceFilename("IV/001\\test")).toBe("IV_001_test");
  });
});

describe("runBulkExport", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty invoiceIds", async () => {
    const result = await runBulkExport({ invoiceIds: [], format: "pdf" });
    expect(result).toBeNull();
    expect(api.getInvoicesBatch).not.toHaveBeenCalled();
  });

  it("creates a ZIP blob when all invoices succeed via single batch call", async () => {
    mockBatchSuccess([{ id: "inv1", ivNo: "IV-001" }]);

    const result = await runBulkExport({ invoiceIds: ["inv1"], format: "pdf" });

    expect(api.getInvoicesBatch).toHaveBeenCalledTimes(1);
    expect(api.getInvoicesBatch).toHaveBeenCalledWith(
      ["inv1"],
      { includeTransactions: true },
      undefined,
    );
    expect(result).not.toBeNull();
    expect(result?.type).toBe("application/zip");
    expect(result?.size).toBeGreaterThan(0);
  });

  it("continues on partial failure and still returns ZIP", async () => {
    mockBatchSuccess([{ id: "inv-ok", ivNo: "IV-OK" }]);

    const progressState: { value: BulkExportProgress | null } = { value: null };
    const result = await runBulkExport({
      invoiceIds: ["inv-ok", "inv-fail"],
      format: "pdf",
      onProgress: (p) => {
        progressState.value = p;
      },
    });

    expect(api.getInvoicesBatch).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
    expect(progressState.value?.done).toBe(2);
    expect(progressState.value?.results).toHaveLength(2);
    expect(progressState.value?.results.find((r) => r.id === "inv-ok")?.ivNo).toBe("IV-OK");
    expect(progressState.value?.results.find((r) => r.id === "inv-fail")?.status).toBe("failed");
  });

  it("uses iv_no when detail exists but transactions are missing", async () => {
    mockBatchSuccess([{ id: "inv1", ivNo: "IV-TXN-FAIL", includeTransactions: false }]);

    const progressState: { value: BulkExportProgress | null } = { value: null };
    const result = await runBulkExport({
      invoiceIds: ["inv1"],
      format: "pdf",
      onProgress: (p) => {
        progressState.value = p;
      },
    });

    expect(result).not.toBeNull();
    expect(progressState.value?.results[0]?.ivNo).toBe("IV-TXN-FAIL");
    expect(progressState.value?.results[0]?.status).toBe("success");
  });

  it("returns null when every invoice fails", async () => {
    vi.mocked(api.getInvoicesBatch).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: { items: [], missing: ["a", "b"] },
    });

    const result = await runBulkExport({ invoiceIds: ["a", "b"], format: "pdf" });
    expect(result).toBeNull();
  });

  it("returns null when aborted before batch fetch completes", async () => {
    const controller = new AbortController();

    vi.mocked(api.getInvoicesBatch).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                success: true,
                code: "SUCCESS",
                message: "ok",
                data: { items: [], missing: [] },
              }),
            100,
          );
        }),
    );

    const promise = runBulkExport({
      invoiceIds: ["1", "2"],
      format: "pdf",
      signal: controller.signal,
    });

    controller.abort();
    await expect(promise).resolves.toBeNull();
    expect(api.getInvoicesBatch).toHaveBeenCalledTimes(1);
  });
});
