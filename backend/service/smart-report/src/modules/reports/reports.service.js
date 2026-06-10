import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { decodeEtag } from "../../lib/etag.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import {
  insertReport,
  findReports,
  findReportById,
  updateReport,
  deleteReport,
} from "./reports.repository.js";
import {
  findDownloadHistory,
  findDownloadHistoryById,
} from "./download-history.repository.js";
import { runReport } from "./scheduler.service.js";

const ROUTE_PROG = "/api/v1/smart-reports";
const ROUTE_PROG_ITEM = "/api/v1/smart-reports/:id";

function serializeReport(report) {
  return {
    id: report._id.toString(),
    name: report.name,
    description: report.description ?? null,
    script: report.script,
    params: report.params ?? {},
    outputFormat: report.outputFormat,
    schedule: report.schedule ?? null,
    enabled: report.enabled,
    cr_by: report.cr_by,
    cr_date: report.cr_date.toISOString(),
    cr_prog: report.cr_prog,
    upd_by: report.upd_by,
    upd_date: report.upd_date.toISOString(),
    upd_prog: report.upd_prog,
  };
}

function serializeHistory(record) {
  return {
    id: record._id.toString(),
    reportId: record.reportId.toString(),
    reportName: record.reportName,
    fileName: record.fileName,
    format: record.format,
    status: record.status,
    recordCount: record.recordCount,
    error: record.error,
    triggeredBy: record.triggeredBy,
    startedAt: record.startedAt.toISOString(),
    finishedAt: record.finishedAt ? record.finishedAt.toISOString() : null,
  };
}

/** ถอดค่า `If-Match` เป็น `Date` ของ `upd_date` เดิม หรือโยน `HttpError` 428/400 */
function requireIfMatchDate(ifMatch) {
  if (!ifMatch) {
    throw new HttpError(
      428,
      CODES.PRECONDITION_REQUIRED,
      "If-Match header is required for this operation.",
    );
  }

  const decoded = decodeEtag(ifMatch);
  if (!decoded) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "Invalid If-Match ETag format.",
    );
  }

  return new Date(decoded);
}

export async function listReports() {
  const db = getDatabase();
  const reports = await findReports(db);
  return reports.map(serializeReport);
}

export async function createReport(payload, userId) {
  const db = getDatabase();
  const now = new Date();

  const report = {
    name: payload.name,
    description: payload.description ?? null,
    script: payload.script,
    params: payload.params ?? {},
    outputFormat: payload.outputFormat,
    schedule: payload.schedule ?? null,
    enabled: payload.enabled ?? true,
    cr_by: userId,
    cr_date: now,
    cr_prog: ROUTE_PROG,
    upd_by: userId,
    upd_date: now,
    upd_prog: ROUTE_PROG,
  };

  const inserted = await insertReport(db, report);
  return serializeReport(inserted);
}

export async function updateReportById(id, payload, ifMatch, userId) {
  const db = getDatabase();
  const objectId = new ObjectId(id);
  const expectedUpdDate = requireIfMatchDate(ifMatch);

  const existing = await findReportById(db, objectId);
  if (!existing) {
    throw new HttpError(404, CODES.RESOURCE_NOT_FOUND, "Report not found");
  }

  const now = new Date();
  const updates = {
    ...payload,
    upd_by: userId,
    upd_date: now,
    upd_prog: ROUTE_PROG_ITEM,
  };

  const result = await updateReport(db, objectId, updates, expectedUpdDate);
  if (result.matchedCount === 0) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "Resource was modified by another request. Refresh and retry.",
    );
  }

  return serializeReport({ ...existing, ...updates, _id: objectId });
}

export async function deleteReportById(id, ifMatch) {
  const db = getDatabase();
  const objectId = new ObjectId(id);
  const expectedUpdDate = requireIfMatchDate(ifMatch);

  const existing = await findReportById(db, objectId);
  if (!existing) {
    throw new HttpError(404, CODES.RESOURCE_NOT_FOUND, "Report not found");
  }

  const result = await deleteReport(db, objectId, expectedUpdDate);
  if (result.deletedCount === 0) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "Resource was modified by another request. Refresh and retry.",
    );
  }
}

export async function runReportById(id) {
  const db = getDatabase();
  const objectId = new ObjectId(id);

  const report = await findReportById(db, objectId);
  if (!report) {
    throw new HttpError(404, CODES.RESOURCE_NOT_FOUND, "Report not found");
  }

  const record = await runReport(db, report, { triggeredBy: "manual" });
  return serializeHistory(record);
}

export async function listHistory() {
  const db = getDatabase();
  const history = await findDownloadHistory(db);
  return history.map(serializeHistory);
}

export async function getDownloadFile(fileId) {
  const db = getDatabase();
  const objectId = new ObjectId(fileId);

  const record = await findDownloadHistoryById(db, objectId);
  if (!record || !record.filePath) {
    throw new HttpError(404, CODES.RESOURCE_NOT_FOUND, "Report file not found");
  }

  return record;
}
