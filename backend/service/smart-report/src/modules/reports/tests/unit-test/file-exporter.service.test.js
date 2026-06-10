import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";

import {
  exportToCsv,
  exportToExcel,
  exportReport,
} from "../../file-exporter.service.js";

const sampleData = [
  { name: "Alice", score: 10 },
  { name: "Bob", score: 20 },
];

describe("file-exporter.service", () => {
  let storageDir;
  let originalStorageDir;

  before(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "smart-report-export-"));
    originalStorageDir = process.env.REPORTS_STORAGE_DIR;
    process.env.REPORTS_STORAGE_DIR = storageDir;
  });

  after(async () => {
    if (originalStorageDir === undefined) {
      delete process.env.REPORTS_STORAGE_DIR;
    } else {
      process.env.REPORTS_STORAGE_DIR = originalStorageDir;
    }
    await rm(storageDir, { recursive: true, force: true });
  });

  test("exportToCsv writes a CSV file under the storage dir and returns its path", async () => {
    const filePath = await exportToCsv(sampleData, "sample.csv");

    assert.equal(path.dirname(filePath), storageDir);
    assert.equal(path.basename(filePath), "sample.csv");

    const content = await readFile(filePath, "utf8");
    assert.match(content, /"?name"?,"?score"?/);
    assert.match(content, /"?Alice"?,10/);
    assert.match(content, /"?Bob"?,20/);
  });

  test("exportToCsv handles an empty dataset without throwing", async () => {
    const filePath = await exportToCsv([], "empty.csv");
    const content = await readFile(filePath, "utf8");
    assert.equal(content, "");
  });

  test("exportToExcel writes an .xlsx file under the storage dir and returns its path", async () => {
    const filePath = await exportToExcel(sampleData, "sample.xlsx");

    assert.equal(path.dirname(filePath), storageDir);
    assert.equal(path.basename(filePath), "sample.xlsx");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    assert.equal(worksheet.getRow(1).getCell(1).value, "name");
    assert.equal(worksheet.getRow(1).getCell(2).value, "score");
    assert.equal(worksheet.getRow(2).getCell(1).value, "Alice");
    assert.equal(worksheet.getRow(2).getCell(2).value, 10);
    assert.equal(worksheet.getRow(3).getCell(1).value, "Bob");
    assert.equal(worksheet.getRow(3).getCell(2).value, 20);
  });

  test("exportReport dispatches to csv or excel based on the requested format", async () => {
    const csvPath = await exportReport(sampleData, {
      fileName: "dispatch.csv",
      format: "csv",
    });
    assert.equal(path.extname(csvPath), ".csv");
    await assert.doesNotReject(readFile(csvPath, "utf8"));

    const excelPath = await exportReport(sampleData, {
      fileName: "dispatch.xlsx",
      format: "excel",
    });
    assert.equal(path.extname(excelPath), ".xlsx");
    await assert.doesNotReject(readFile(excelPath));
  });
});
