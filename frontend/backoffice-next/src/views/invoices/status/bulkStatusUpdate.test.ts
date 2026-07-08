import { afterEach, describe, expect, it, vi } from "vitest";

import * as api from "../../../lib/invoicesApiClient";
import { makeTestInvoice } from "../export/testFixtures";
import { runBulkStatusUpdate } from "./bulkStatusUpdate";

vi.mock("../../../lib/invoicesApiClient");

function mockReadyInvoice(id: string, ivNo: string, updDate = "2026-06-24T10:00:00.000Z") {
  vi.mocked(api.getInvoiceById).mockImplementation(async (invoiceId) => {
    if (invoiceId !== id) {
      throw new Error("not found");
    }
    return {
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: id, iv_no: ivNo, status: "READY", upd_date: updDate }),
    };
  });
}

describe("runBulkStatusUpdate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty summary for no ids", async () => {
    const summary = await runBulkStatusUpdate({ invoiceIds: [], action: "PAID" });
    expect(summary).toEqual({ successCount: 0, failedCount: 0, cancelledCount: 0 });
  });

  it("marks READY invoices as PAID", async () => {
    mockReadyInvoice("inv1", "IV-001");
    vi.mocked(api.updateInvoiceStatus).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: "inv1", iv_no: "IV-001", status: "PAID" }),
    });

    const summary = await runBulkStatusUpdate({ invoiceIds: ["inv1"], action: "PAID" });

    expect(summary.successCount).toBe(1);
    expect(api.updateInvoiceStatus).toHaveBeenCalledWith("inv1", "PAID", `W/"${btoa("2026-06-24T10:00:00.000Z")}"`);
  });

  it("fails ineligible invoices without calling update", async () => {
    vi.mocked(api.getInvoiceById).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: "inv1", iv_no: "IV-001", status: "PAID" }),
    });

    const summary = await runBulkStatusUpdate({ invoiceIds: ["inv1"], action: "PAID" });

    expect(summary.failedCount).toBe(1);
    expect(api.updateInvoiceStatus).not.toHaveBeenCalled();
  });

  it("fails when upd_date is missing", async () => {
    vi.mocked(api.getInvoiceById).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: "inv1", iv_no: "IV-001", status: "READY" }),
    });

    const summary = await runBulkStatusUpdate({ invoiceIds: ["inv1"], action: "PAID" });

    expect(summary.failedCount).toBe(1);
    expect(api.updateInvoiceStatus).not.toHaveBeenCalled();
  });

  it("continues on partial API failure", async () => {
    mockReadyInvoice("inv-ok", "IV-OK");
    vi.mocked(api.getInvoiceById).mockImplementation(async (id) => {
      if (id === "inv-ok") {
        return {
          success: true,
          code: "SUCCESS",
          message: "ok",
          data: makeTestInvoice({
            _id: "inv-ok",
            iv_no: "IV-OK",
            status: "READY",
            upd_date: "2026-06-24T10:00:00.000Z",
          }),
        };
      }
      throw new Error("not found");
    });
    vi.mocked(api.updateInvoiceStatus).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: "inv-ok", status: "PAID" }),
    });

    const summary = await runBulkStatusUpdate({
      invoiceIds: ["inv-ok", "inv-fail"],
      action: "PAID",
    });

    expect(summary.successCount).toBe(1);
    expect(summary.failedCount).toBe(1);
  });

  it("marks unprocessed items cancelled when aborted", async () => {
    const controller = new AbortController();
    vi.mocked(api.getInvoiceById).mockImplementation(async () => {
      controller.abort();
      throw new Error("aborted");
    });

    const summary = await runBulkStatusUpdate({
      invoiceIds: ["inv1", "inv2"],
      action: "VOID",
      signal: controller.signal,
    });

    expect(summary.cancelledCount).toBeGreaterThan(0);
  });

  it("voids cancelable invoices", async () => {
    vi.mocked(api.getInvoiceById).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({
        _id: "inv1",
        iv_no: "IV-001",
        status: "PENDING",
        upd_date: "2026-06-24T10:00:00.000Z",
      }),
    });
    vi.mocked(api.updateInvoiceStatus).mockResolvedValue({
      success: true,
      code: "SUCCESS",
      message: "ok",
      data: makeTestInvoice({ _id: "inv1", status: "VOID" }),
    });

    const summary = await runBulkStatusUpdate({ invoiceIds: ["inv1"], action: "VOID" });

    expect(summary.successCount).toBe(1);
    expect(api.updateInvoiceStatus).toHaveBeenCalledWith("inv1", "VOID", expect.any(String));
  });
});
