import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Parser } from "json2csv";
import ExcelJS from "exceljs";

const DEFAULT_STORAGE_DIR = "storage/reports";

/** Local-disk path ที่ใช้เก็บไฟล์รายงาน (ถาวร, ไม่มี auto-delete) */
export function getStorageDir() {
  return path.resolve(
    process.cwd(),
    process.env.REPORTS_STORAGE_DIR || DEFAULT_STORAGE_DIR,
  );
}

async function writeToStorage(fileName, content) {
  const storageDir = getStorageDir();
  await mkdir(storageDir, { recursive: true });
  const filePath = path.join(storageDir, fileName);
  await writeFile(filePath, content);
  return filePath;
}

/**
 * แปลงข้อมูลเป็น CSV และบันทึกลง local storage
 * @param {Record<string, unknown>[]} data
 * @param {string} fileName
 * @returns {Promise<string>} absolute file path
 */
export async function exportToCsv(data, fileName) {
  const csv =
    data.length === 0
      ? ""
      : new Parser({ fields: Object.keys(data[0]) }).parse(data);
  return writeToStorage(fileName, csv);
}

/**
 * แปลงข้อมูลเป็น Excel (.xlsx) และบันทึกลง local storage
 * @param {Record<string, unknown>[]} data
 * @param {string} fileName
 * @returns {Promise<string>} absolute file path
 */
export async function exportToExcel(data, fileName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  if (data.length > 0) {
    worksheet.columns = Object.keys(data[0]).map((key) => ({
      header: key,
      key,
    }));
    worksheet.addRows(data);
  }

  const storageDir = getStorageDir();
  await mkdir(storageDir, { recursive: true });
  const filePath = path.join(storageDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

/**
 * ส่งออกผลลัพธ์รายงานตาม `outputFormat` ("csv" | "excel")
 * @param {Record<string, unknown>[]} data
 * @param {object} options
 * @param {string} options.fileName
 * @param {"csv"|"excel"} options.format
 * @returns {Promise<string>} absolute file path
 */
export async function exportReport(data, { fileName, format }) {
  if (format === "excel") return exportToExcel(data, fileName);
  return exportToCsv(data, fileName);
}
