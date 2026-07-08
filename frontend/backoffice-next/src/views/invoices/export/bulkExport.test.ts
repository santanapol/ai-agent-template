import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "../../../lib/invoicesApiClient";
import { runBulkExport, sanitizeInvoiceFilename } from "./bulkExport";
import { makeTestInvoice, makeTestTransaction } from "./testFixtures";
import type { BulkExportProgress } from "./types";

vi.mock("../../../lib/invoicesApiClient");

function mockInvoiceSuccess(id: string, ivNo: string) {
  vi.mocked(api.getInvoiceById).mockImplementation(async (invoiceId) => {
    if (invoiceId !== id) {
      throw new Error("not found");
    }
    return {
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: id, iv_no: ivNo }),
    };
  });

  vi.mocked(api.listInvoiceTransactions).mockImplementation(async (invoiceId) => {
    if (invoiceId !== id) {
      throw new Error("not found");
    }
    return {
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: [makeTestTransaction({ ref_iv_id: id })],
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
  });

  it("creates a ZIP blob when all invoices succeed", async () => {
    mockInvoiceSuccess("inv1", "IV-001");

    const result = await runBulkExport({ invoiceIds: ["inv1"], format: "pdf" });

    expect(result).not.toBeNull();
    expect(result?.type).toBe("application/zip");
    expect(result?.size).toBeGreaterThan(0);
  });

  it("continues on partial failure and still returns ZIP", async () => {
    vi.mocked(api.getInvoiceById).mockImplementation(async (id) => {
      if (id === "inv-ok") {
        return {
          success: true,
          code: "SUCCESS",
          message: "ok",
          data: makeTestInvoice({ _id: "inv-ok", iv_no: "IV-OK" }),
        };
      }
      throw new Error("not found");
    });

    vi.mocked(api.listInvoiceTransactions).mockImplementation(async (id) => {
      if (id === "inv-ok") {
        return {
          success: true,
          code: "SUCCESS",
          message: "ok",
          data: [makeTestTransaction({ ref_iv_id: "inv-ok" })],
        };
      }
      throw new Error("not found");
    });

    const progressState: { value: BulkExportProgress | null } = { value: null };
    const result = await runBulkExport({
      invoiceIds: ["inv-ok", "inv-fail"],
      format: "pdf",
      onProgress: (p) => {
        progressState.value = p;
      },
    });

    expect(result).not.toBeNull();
    expect(progressState.value?.done).toBe(2);
    expect(progressState.value?.results).toHaveLength(2);
    expect(progressState.value?.results.find((r) => r.id === "inv-ok")?.ivNo).toBe("IV-OK");
    expect(progressState.value?.results.find((r) => r.id === "inv-fail")?.status).toBe("failed");
  });

  it("uses iv_no when detail succeeds but transactions fail", async () => {
    vi.mocked(api.getInvoiceById).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: "inv1", iv_no: "IV-TXN-FAIL" }),
    });
    vi.mocked(api.listInvoiceTransactions).mockRejectedValue(new Error("txn failed"));

    const progressState: { value: BulkExportProgress | null } = { value: null };
    const result = await runBulkExport({
      invoiceIds: ["inv1"],
      format: "pdf",
      onProgress: (p) => {
        progressState.value = p;
      },
    });

    expect(result).toBeNull();
    expect(progressState.value?.results[0]?.ivNo).toBe("IV-TXN-FAIL");
    expect(progressState.value?.results[0]?.status).toBe("failed");
  });

  it("returns null when every invoice fails", async () => {
    vi.mocked(api.getInvoiceById).mockRejectedValue(new Error("boom"));
    vi.mocked(api.listInvoiceTransactions).mockRejectedValue(new Error("boom"));

    const result = await runBulkExport({ invoiceIds: ["a", "b"], format: "pdf" });
    expect(result).toBeNull();
  });

  it("returns partial ZIP and marks unprocessed items cancelled when aborted", async () => {
    const controller = new AbortController();
    let callCount = 0;

    vi.mocked(api.getInvoiceById).mockImplementation(async (id, signal) => {
      callCount += 1;
      if (id !== "1") {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (signal?.aborted) {
        throw new Error("aborted");
      }
      return {
        success: true,
        code: "SUCCESS",
        message: "ok",
        data: makeTestInvoice({ _id: id, iv_no: `IV-${id}` }),
      };
    });

    vi.mocked(api.listInvoiceTransactions).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: [],
    });

    const progressState: { value: BulkExportProgress | null } = { value: null };

    const promise = runBulkExport({
      invoiceIds: ["1", "2", "3", "4"],
      format: "pdf",
      concurrency: 1,
      signal: controller.signal,
      onProgress: (p) => {
        progressState.value = p;
      },
    });

    setTimeout(() => controller.abort(), 20);
    const result = await promise;

    expect(result).not.toBeNull();
    expect(result?.type).toBe("application/zip");
    expect(progressState.value?.done).toBe(4);
    expect(progressState.value?.total).toBe(4);
    expect(progressState.value?.results).toHaveLength(4);

    const statuses = progressState.value?.results.map((r) => r.status) ?? [];
    expect(statuses.filter((s) => s === "success")).toHaveLength(1);
    expect(statuses.filter((s) => s === "cancelled").length).toBeGreaterThanOrEqual(2);
    expect(new Set(progressState.value?.results.map((r) => r.id)).size).toBe(4);
    expect(callCount).toBeLessThan(4);
  });
});
