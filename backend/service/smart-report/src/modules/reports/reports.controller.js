import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";

import { successEnvelope } from "../../lib/envelope.js";
import { buildEtag } from "../../lib/etag.js";
import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import { assertPermission } from "../../lib/assert-permission.js";
import * as service from "./reports.service.js";

const CONTENT_TYPES = {
  csv: "text/csv",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function listReportsHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const { page, limit } = request.query;
  const { data, pagination } = await service.listReports({ page, limit });
  return reply
    .status(200)
    .send(successEnvelope(data, null, CODES.SUCCESS, pagination));
}

export async function createReportHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const { userId } = request.userContext;
  const created = await service.createReport(request.body, userId);

  reply.header("ETag", buildEtag(created.upd_date));
  return reply
    .status(201)
    .send(
      successEnvelope(created, "Resource created successfully.", CODES.CREATED),
    );
}

export async function updateReportHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const { userId } = request.userContext;
  const ifMatch = request.headers["if-match"];

  const updated = await service.updateReportById(
    request.params.id,
    request.body,
    ifMatch,
    userId,
  );

  reply.header("ETag", buildEtag(updated.upd_date));
  return reply.status(200).send(successEnvelope(null, "Updated successfully."));
}

export async function deleteReportHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const ifMatch = request.headers["if-match"];

  await service.deleteReportById(request.params.id, ifMatch);

  return reply.status(200).send(successEnvelope(null, "Deleted successfully."));
}

export async function runReportHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const record = await service.runReportById(request.params.id);
  return reply.status(200).send(successEnvelope(record));
}

export async function listHistoryHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const { page, limit } = request.query;
  const { data, pagination } = await service.listHistory({ page, limit });
  return reply
    .status(200)
    .send(successEnvelope(data, null, CODES.SUCCESS, pagination));
}

export async function downloadFileHandler(request, reply) {
  assertPermission(request.userContext, "reports:smart");
  const record = await service.getDownloadFile(request.params.fileId);

  try {
    await stat(record.filePath);
  } catch {
    throw new HttpError(404, CODES.RESOURCE_NOT_FOUND, "Report file not found");
  }

  reply.header(
    "Content-Type",
    CONTENT_TYPES[record.format] ?? "application/octet-stream",
  );
  reply.header(
    "Content-Disposition",
    `attachment; filename="${record.fileName}"`,
  );
  return reply.send(createReadStream(record.filePath));
}
