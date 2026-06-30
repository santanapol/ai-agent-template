import {
  listReportsSchema,
  createReportSchema,
  updateReportSchema,
  deleteReportSchema,
  runReportSchema,
  validateReportSchema,
  testRunReportSchema,
  historySchema,
  downloadFileSchema,
} from "./reports.schema.js";
import * as controller from "./reports.controller.js";

export default async function reportsRoute(fastify) {
  // POST /api/v1/smart-reports/validate
  fastify.post(
    "/validate",
    { schema: validateReportSchema },
    controller.validateReportHandler,
  );

  // POST /api/v1/smart-reports/test-run
  fastify.post(
    "/test-run",
    { schema: testRunReportSchema },
    controller.testRunReportHandler,
  );

  // GET /api/v1/smart-reports/history
  fastify.get(
    "/history",
    { schema: historySchema },
    controller.listHistoryHandler,
  );

  // GET /api/v1/smart-reports/download/:fileId
  fastify.get(
    "/download/:fileId",
    { schema: downloadFileSchema },
    controller.downloadFileHandler,
  );

  // GET /api/v1/smart-reports
  fastify.get(
    "/",
    { schema: listReportsSchema },
    controller.listReportsHandler,
  );

  // POST /api/v1/smart-reports
  fastify.post(
    "/",
    { schema: createReportSchema },
    controller.createReportHandler,
  );

  // PUT /api/v1/smart-reports/:id
  fastify.put(
    "/:id",
    { schema: updateReportSchema },
    controller.updateReportHandler,
  );

  // DELETE /api/v1/smart-reports/:id
  fastify.delete(
    "/:id",
    { schema: deleteReportSchema },
    controller.deleteReportHandler,
  );

  // POST /api/v1/smart-reports/:id/run
  fastify.post(
    "/:id/run",
    { schema: runReportSchema },
    controller.runReportHandler,
  );

  // GET /api/v1/smart-reports/history — registered above /:id routes
  // GET /api/v1/smart-reports/download/:fileId — registered above
}
