import { describe, expect, it, vi } from "vitest";

import type { DepositMatrixData } from "@/types/branchReport";

import {
  buildDepositMatrixExportRows,
  exportDepositMatrixToCsv,
  exportDepositMatrixToXlsx,
} from "./depositMatrixExport";

vi.mock("@/lib/downloadBlob", () => ({
  triggerBlobDownload: vi.fn(),
}));

const sampleData: DepositMatrixData = {
  buckets: [
    { key: "0-99", label: "0 - 99", min: 0, max: 99 },
    { key: "100-199", label: "100 - 199", min: 100, max: 199 },
  ],
  rounds: 3,
  counts: [
    [2, 0, 1],
    [0, 1, 0],
  ],
  rowSums: [3, 1],
  percents: [
    [66.67, 0, 100],
    [0, 33.33, 0],
  ],
  percentRowSums: [75, 25],
};

describe("buildDepositMatrixExportRows", () => {
  it("builds count-mode headers and rows matching on-screen formatting", () => {
    const { headers, rows } = buildDepositMatrixExportRows(sampleData, "count");

    expect(headers).toEqual(["Rank", "1", "2", "3", "SUM"]);
    expect(rows).toEqual([
      ["0 - 99", "2", "0", "1", "3"],
      ["100 - 199", "0", "1", "0", "1"],
    ]);
  });

  it("builds percent-mode headers and rows matching on-screen formatting", () => {
    const { headers, rows } = buildDepositMatrixExportRows(sampleData, "percent");

    expect(headers).toEqual(["Rank", "1", "2", "3", "SUM"]);
    expect(rows).toEqual([
      ["0 - 99", "66.67%", "0.00%", "100.00%", "75.00%"],
      ["100 - 199", "0.00%", "33.33%", "0.00%", "25.00%"],
    ]);
  });
});

describe("exportDepositMatrixToCsv", () => {
  it("downloads a CSV blob with the expected content", async () => {
    const { triggerBlobDownload } = await import("@/lib/downloadBlob");

    exportDepositMatrixToCsv(sampleData, "count", "matrix-count");

    expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), "matrix-count.csv");
    const blob = vi.mocked(triggerBlobDownload).mock.calls.at(-1)?.[0] as Blob;
    const text = await blob.text();
    expect(text).toBe("Rank,1,2,3,SUM\n0 - 99,2,0,1,3\n100 - 199,0,1,0,1");
  });
});

describe("exportDepositMatrixToXlsx", () => {
  it("downloads an XLSX blob with the expected sheet content", async () => {
    const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const { triggerBlobDownload } = await import("@/lib/downloadBlob");

    await exportDepositMatrixToXlsx(sampleData, "percent", "matrix-percent");

    expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), "matrix-percent.xlsx");
    const blob = vi.mocked(triggerBlobDownload).mock.calls.at(-1)?.[0] as Blob;
    expect(blob.type).toBe(XLSX_MIME);
    expect(blob.size).toBeGreaterThan(0);

    // Parse the actual workbook - blob type/size alone can't catch a swapped
    // column or dropped row.
    const XLSX = await import("xlsx");
    const buffer = await blob.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    expect(rows).toEqual([
      ["Rank", "1", "2", "3", "SUM"],
      ["0 - 99", "66.67%", "0.00%", "100.00%", "75.00%"],
      ["100 - 199", "0.00%", "33.33%", "0.00%", "25.00%"],
    ]);
  });
});

describe("buildDepositMatrixExportRows edge cases", () => {
  it("keeps the unbounded '10,000 +' bucket label untouched (max is null on the wire)", () => {
    const dataWithUnboundedBucket: DepositMatrixData = {
      buckets: [{ key: "10000+", label: "10,000 +", min: 10_000, max: null }],
      rounds: 2,
      counts: [[5, 0]],
      rowSums: [5],
      percents: [[100, 0]],
      percentRowSums: [100],
    };

    const { rows } = buildDepositMatrixExportRows(dataWithUnboundedBucket, "count");

    expect(rows).toEqual([["10,000 +", "5", "0", "5"]]);
  });

  it("falls back to 0 for a row whose counts/rowSums are shorter than buckets (defensive desync guard)", () => {
    const desynced: DepositMatrixData = {
      buckets: [
        { key: "0-99", label: "0 - 99", min: 0, max: 99 },
        { key: "100-199", label: "100 - 199", min: 100, max: 199 },
      ],
      rounds: 2,
      // Only one row of counts/rowSums for two buckets - simulates the API
      // response desyncing from the bucket list.
      counts: [[1, 2]],
      rowSums: [3],
      percents: [[50, 50]],
      percentRowSums: [100],
    };

    const { rows } = buildDepositMatrixExportRows(desynced, "count");

    expect(rows).toEqual([
      ["0 - 99", "1", "2", "3"],
      ["100 - 199", "0", "0", "0"],
    ]);
  });

  it("renders an all-zero row as zeros, not blank cells", () => {
    const allZero: DepositMatrixData = {
      buckets: [{ key: "0-99", label: "0 - 99", min: 0, max: 99 }],
      rounds: 3,
      counts: [[0, 0, 0]],
      rowSums: [0],
      percents: [[0, 0, 0]],
      percentRowSums: [0],
    };

    const { rows } = buildDepositMatrixExportRows(allZero, "count");

    expect(rows).toEqual([["0 - 99", "0", "0", "0", "0"]]);
  });
});
