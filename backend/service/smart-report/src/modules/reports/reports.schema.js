import { historyQuery, listReportsQuery } from "./reports-query.schema.js";

const baseTrustedHeaderProperties = {
  "x-user-ou": { type: "string" },
  "x-user-branch": { type: "string" },
  "x-user-id": { type: "string" },
  "x-user-role": { type: "string" },
};

const trustedHeaders = {
  type: "object",
  properties: {
    ...baseTrustedHeaderProperties,
    "x-request-id": { type: "string" },
  },
};

const trustedHeadersWithIfMatch = {
  type: "object",
  properties: {
    ...baseTrustedHeaderProperties,
    "if-match": { type: "string" },
    "x-request-id": { type: "string" },
  },
};

const errorResponse = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    code: { type: "string" },
    message: { type: "string" },
    data: { type: "null" },
    requestId: { type: "string" },
  },
};

const scheduleSchema = {
  type: ["object", "null"],
  required: ["frequency"],
  properties: {
    frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
    hour: { type: "integer", minimum: 0, maximum: 23 },
    minute: { type: "integer", minimum: 0, maximum: 59 },
    dayOfWeek: { type: "integer", minimum: 0, maximum: 6 },
    dayOfMonth: {
      anyOf: [
        { type: "integer", minimum: 1, maximum: 31 },
        { type: "string", enum: ["last"] },
      ],
    },
    timezone: { type: "string" },
  },
};

const reportListProperties = {
  id: { type: "string" },
  name: { type: "string" },
  description: { type: ["string", "null"] },
  params: { type: "object" },
  outputFormat: { type: "string", enum: ["csv", "excel"] },
  schedule: scheduleSchema,
  enabled: { type: "boolean" },
  validationStatus: { type: "string", enum: ["pending", "valid", "invalid"] },
  validatedAt: { type: ["string", "null"] },
  lastTestRunAt: { type: ["string", "null"] },
  lastTestRunMeta: {
    type: ["object", "null"],
    properties: {
      recordCount: { type: ["number", "null"] },
    },
  },
  cr_by: { type: "string" },
  cr_date: { type: "string" },
  cr_prog: { type: "string" },
  upd_by: { type: "string" },
  upd_date: { type: "string" },
  upd_prog: { type: "string" },
};

const reportDetailProperties = {
  ...reportListProperties,
  script: { type: "string" },
  compiledScript: { type: ["string", "null"] },
  validationErrors: {
    type: "array",
    items: { type: "string" },
  },
  lastTestRunMeta: {
    type: ["object", "null"],
    properties: {
      recordCount: { type: ["number", "null"] },
      durationMs: { type: ["number", "null"] },
    },
  },
};

const historyProperties = {
  id: { type: "string" },
  reportId: { type: "string" },
  reportName: { type: "string" },
  fileName: { type: ["string", "null"] },
  format: { type: "string" },
  status: { type: "string" },
  recordCount: { type: ["number", "null"] },
  error: { type: ["string", "null"] },
  triggeredBy: { type: "string" },
  startedAt: { type: "string" },
  finishedAt: { type: ["string", "null"] },
};

const reportBodyProperties = {
  name: { type: "string", minLength: 1 },
  description: { type: ["string", "null"] },
  script: { type: "string", minLength: 1 },
  compiledScript: { type: "string", minLength: 1 },
  testRunToken: { type: "string", minLength: 1 },
  params: { type: "object" },
  outputFormat: { type: "string", enum: ["csv", "excel"] },
  schedule: scheduleSchema,
  enabled: { type: "boolean" },
};

const idParam = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
  },
};

const paginationProperties = {
  page: { type: "integer" },
  limit: { type: "integer" },
  total: { type: "integer" },
  totalPages: { type: "integer" },
};

export const listReportsSchema = {
  description: "List all smart report definitions",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  querystring: listReportsQuery,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "array",
          items: { type: "object", properties: reportListProperties },
        },
        pagination: { type: "object", properties: paginationProperties },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const createReportSchema = {
  description: "Create a new smart report definition",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  body: {
    type: "object",
    required: ["name", "script", "compiledScript", "outputFormat"],
    additionalProperties: false,
    properties: reportBodyProperties,
  },
  response: {
    201: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "object",
          properties: reportDetailProperties,
        },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const updateReportSchema = {
  description: "Update a smart report definition (requires If-Match)",
  tags: ["smart-reports"],
  headers: trustedHeadersWithIfMatch,
  params: idParam,
  body: {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: reportBodyProperties,
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: { type: "null" },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const deleteReportSchema = {
  description: "Delete a smart report definition (requires If-Match)",
  tags: ["smart-reports"],
  headers: trustedHeadersWithIfMatch,
  params: idParam,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: { type: "null" },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const runReportSchema = {
  description: "Manually trigger a smart report run",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  params: idParam,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: { type: "object", properties: historyProperties },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const historySchema = {
  description: "List download history for all smart reports",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  querystring: historyQuery,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "array",
          items: { type: "object", properties: historyProperties },
        },
        pagination: { type: "object", properties: paginationProperties },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const downloadFileSchema = {
  description: "Download the exported report file (CSV or Excel)",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  params: {
    type: "object",
    required: ["fileId"],
    properties: {
      fileId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
    },
  },
  response: {
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

const validationErrorProperties = {
  line: { type: ["integer", "null"] },
  message: { type: "string" },
  code: { type: ["string", "null"] },
};

export const validateReportSchema = {
  description: "Validate and compile a Booster-style report script",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  body: {
    type: "object",
    required: ["script"],
    additionalProperties: false,
    properties: {
      script: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            compiledScript: { type: ["string", "null"] },
            errors: {
              type: "array",
              items: { type: "object", properties: validationErrorProperties },
            },
          },
        },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const getReportSchema = {
  description: "Get a smart report definition by id",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  params: idParam,
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: { type: "object", properties: reportDetailProperties },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};

export const testRunReportSchema = {
  description: "Execute a compiled report script against the read database",
  tags: ["smart-reports"],
  headers: trustedHeaders,
  body: {
    type: "object",
    required: ["script", "compiledScript"],
    additionalProperties: false,
    properties: {
      script: { type: "string", minLength: 1 },
      compiledScript: { type: "string", minLength: 1 },
      params: { type: "object" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            recordCount: { type: "number" },
            durationMs: { type: "number" },
            sample: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: true,
              },
            },
            testRunToken: { type: "string" },
            runParams: {
              type: "object",
              properties: {
                startDate: { type: "string" },
                endDate: { type: "string" },
              },
            },
            errors: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    "4xx": errorResponse,
    "5xx": errorResponse,
  },
};
