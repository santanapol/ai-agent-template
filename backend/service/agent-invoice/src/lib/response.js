export const INTERNAL_ERROR_MESSAGE = 'An internal error occurred';

/** @type {Record<string, number>} */
export const SERVICE_CODE_HTTP = {
  SUCCESS: 200,
  INVALID_PARAM: 400,
  INVALID_USER_CONTEXT: 403,
  RESOURCE_NOT_FOUND: 404,
  RATE_LIMIT_EXCEEDED: 429,
  PARTIAL_FAILURE: 422,
  VERSION_CONFLICT: 412,
  PRECONDITION_REQUIRED: 428,
  INTERNAL_ERROR: 500,
  DATASTORE_CREDENTIAL_REJECTED: 500,
};

/**
 * @param {string} code
 * @returns {number}
 */
export function httpStatusForCode(code) {
  return SERVICE_CODE_HTTP[code] ?? 500;
}

export function buildSuccessReply({ code = 'SUCCESS', message = 'Operation successful', data = null, pagination = undefined }) {
  const body = { success: true, code, message, data };
  if (pagination !== undefined) {
    body.pagination = pagination;
  }
  return body;
}

export function buildErrorReply({
  code,
  message,
  requestId,
  data = null,
}) {
  return {
    success: false,
    code,
    message,
    data,
    requestId,
  };
}

export function sendSuccess(reply, options = {}) {
  const statusCode = options.statusCode ?? 200;
  return reply.status(statusCode).send(buildSuccessReply(options));
}

export function sendError(reply, { statusCode, code, message, requestId, data = null }) {
  return reply.status(statusCode).send(buildErrorReply({ code, message, requestId, data }));
}
