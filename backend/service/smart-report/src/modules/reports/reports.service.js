import { ObjectId } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { decodeEtag } from "../../lib/etag.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import {
  insertReport,
  findReportsPage,
  findReportById,
  updateReport,
  deleteReport,
} from "./reports.repository.js";
import {
  findDownloadHistoryPage,
  findDownloadHistoryById,
} from "./download-history.repository.js";
import {
  runReport,
  reloadScheduler,
  buildReportRunParams,
} from "./scheduler.service.js";
import { compileBoosterScript } from "./script-compiler.service.js";
import { runReportScript } from "./sandbox-runner.service.js";
import {
  issueTestRunToken,
  verifyTestRunToken,
} from "./test-run-token.service.js";

const ROUTE_PROG = "/api/v1/smart-reports";
const ROUTE_PROG_ITEM = "/api/v1/smart-reports/:id";

function toRows(result) {
  if (Array.isArray(result)) return result;
  if (result === null || result === undefined) return [];
  return [result];
}

function serializeReportListItem(report) {
  return {
    id: report._id.toString(),
    name: report.name,
    description: report.description ?? null,
    params: report.params ?? {},
    outputFormat: report.outputFormat,
    schedule: report.schedule ?? null,
    enabled: report.enabled,
    validationStatus: report.validationStatus ?? "pending",
    validatedAt: report.validatedAt ? report.validatedAt.toISOString() : null,
    lastTestRunAt: report.lastTestRunAt
      ? report.lastTestRunAt.toISOString()
      : null,
    lastTestRunMeta: report.lastTestRunMeta
      ? { recordCount: report.lastTestRunMeta.recordCount ?? null }
      : null,
    cr_by: report.cr_by,
    cr_date: report.cr_date.toISOString(),
    cr_prog: report.cr_prog,
    upd_by: report.upd_by,
    upd_date: report.upd_date.toISOString(),
    upd_prog: report.upd_prog,
  };
}

function serializeReportDetail(report) {
  return {
    ...serializeReportListItem(report),
    script: report.script,
    compiledScript: report.compiledScript ?? null,
    validationErrors: report.validationErrors ?? [],
    lastTestRunMeta: report.lastTestRunMeta ?? null,
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

function assertCompiledScriptMatches(script, compiledScript) {
  const compiled = compileBoosterScript(script);
  if (!compiled.success) {
    throw new HttpError(
      422,
      CODES.REPORT_NOT_VALIDATED,
      compiled.errors[0]?.message ?? "Script validation failed.",
    );
  }
  if (compiled.compiledScript !== compiledScript) {
    throw new HttpError(
      422,
      CODES.VALIDATION_FAILED,
      "compiledScript does not match the provided script.",
    );
  }
}

function requireVerifiedTestRunToken({ script, compiledScript, testRunToken }) {
  if (!testRunToken) {
    throw new HttpError(
      422,
      CODES.REPORT_NOT_TESTED,
      "testRunToken is required when saving a script.",
    );
  }

  const verified = verifyTestRunToken(testRunToken, { script, compiledScript });
  if (!verified.valid) {
    throw new HttpError(
      422,
      CODES.TEST_RUN_TOKEN_INVALID,
      "Test run token is missing, expired, or invalid.",
    );
  }

  return verified;
}

function assertScriptSaveGate({ script, compiledScript, testRunToken }) {
  if (!compiledScript) {
    throw new HttpError(
      422,
      CODES.REPORT_NOT_VALIDATED,
      "compiledScript is required when saving a script.",
    );
  }

  assertCompiledScriptMatches(script, compiledScript);
  return requireVerifiedTestRunToken({ script, compiledScript, testRunToken });
}

/** สร้าง pagination metadata จากค่า page/limit ที่ขอ และ total จำนวนเอกสารทั้งหมด */
export function buildPagination({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function validateScript(script) {
  const result = compileBoosterScript(script);
  return {
    valid: result.success,
    compiledScript: result.compiledScript,
    errors: result.errors,
  };
}

export async function testRunScript({
  script,
  compiledScript,
  params = {},
  now = new Date(),
}) {
  assertCompiledScriptMatches(script, compiledScript);

  const runParams = buildReportRunParams(params, now);
  const startedAt = Date.now();

  try {
    const result = await runReportScript({
      script: compiledScript,
      params: runParams,
    });
    const rows = toRows(result);
    const durationMs = Date.now() - startedAt;

    return {
      success: true,
      recordCount: rows.length,
      durationMs,
      sample: rows.slice(0, 5),
      testRunToken: issueTestRunToken({
        script,
        compiledScript,
        recordCount: rows.length,
        durationMs,
      }),
      errors: [],
    };
  } catch (error) {
    if (String(error.message).includes("timed out")) {
      throw new HttpError(
        422,
        CODES.TEST_RUN_TIMEOUT,
        "Test run exceeded the configured time limit.",
      );
    }
    throw error;
  }
}

export async function listReports({ page = 1, limit = 20 } = {}) {
  const db = getDatabase();
  const { items, total } = await findReportsPage(db, { page, limit });

  return {
    data: items.map(serializeReportListItem),
    pagination: buildPagination({ page, limit }, total),
  };
}

export async function getReportDetail(id) {
  const db = getDatabase();
  const objectId = new ObjectId(id);
  const report = await findReportById(db, objectId);
  if (!report) {
    throw new HttpError(404, CODES.RESOURCE_NOT_FOUND, "Report not found");
  }
  return serializeReportDetail(report);
}

export async function createReport(payload, userId) {
  const db = getDatabase();
  const now = new Date();
  const verified = assertScriptSaveGate(payload);

  const report = {
    name: payload.name,
    description: payload.description ?? null,
    script: payload.script,
    compiledScript: payload.compiledScript,
    validationStatus: "valid",
    validationErrors: [],
    validatedAt: now,
    lastTestRunAt: verified.testedAt ?? now,
    lastTestRunMeta: {
      recordCount: verified.recordCount ?? 0,
      durationMs: verified.durationMs ?? 0,
    },
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
  await reloadScheduler(db);
  return serializeReportDetail(inserted);
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
  const scriptChanging =
    payload.script !== undefined && payload.script !== existing.script;

  let validationFields = {};
  if (scriptChanging) {
    const verified = assertScriptSaveGate({
      script: payload.script,
      compiledScript: payload.compiledScript,
      testRunToken: payload.testRunToken,
    });
    validationFields = {
      script: payload.script,
      compiledScript: payload.compiledScript,
      validationStatus: "valid",
      validationErrors: [],
      validatedAt: now,
      lastTestRunAt: verified.testedAt ?? now,
      lastTestRunMeta: {
        recordCount: verified.recordCount ?? 0,
        durationMs: verified.durationMs ?? 0,
      },
    };
  }

  const updates = {
    ...payload,
    ...validationFields,
    upd_by: userId,
    upd_date: now,
    upd_prog: ROUTE_PROG_ITEM,
  };
  delete updates.testRunToken;

  if (!scriptChanging) {
    for (const field of [
      "script",
      "compiledScript",
      "validationStatus",
      "validatedAt",
      "lastTestRunAt",
      "lastTestRunMeta",
      "validationErrors",
    ]) {
      delete updates[field];
    }
  }

  const result = await updateReport(db, objectId, updates, expectedUpdDate);
  if (result.matchedCount === 0) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "Resource was modified by another request. Refresh and retry.",
    );
  }

  await reloadScheduler(db);

  return serializeReportDetail({ ...existing, ...updates, _id: objectId });
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

  await reloadScheduler(db);
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

export async function listHistory({ page = 1, limit = 20 } = {}) {
  const db = getDatabase();
  const { items, total } = await findDownloadHistoryPage(db, { page, limit });

  return {
    data: items.map(serializeHistory),
    pagination: buildPagination({ page, limit }, total),
  };
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
