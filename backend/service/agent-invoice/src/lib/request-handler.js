import { decodeEtag } from './etag.js';
import { INTERNAL_ERROR_MESSAGE } from './response.js';

/**
 * Extract user context from gateway-propagated headers.
 * @param {import('fastify').FastifyRequest} request
 */
export function extractContext(request) {
  return {
    ouId: request.headers['x-user-ou'],
    branchId: request.headers['x-user-branch'],
    userId: request.headers['x-user-id'],
    requestId: request.requestId,
  };
}

/**
 * Map service-layer errors (with statusCode) to standard API envelope.
 * Unmapped errors are re-thrown for the global error handler.
 *
 * @param {Error & { statusCode?: number }} error
 * @param {import('fastify').FastifyReply} reply
 * @param {string} requestId
 */
export function handleError(error, reply, requestId) {
  const statusMap = {
    400: 'INVALID_PARAM',
    404: 'RESOURCE_NOT_FOUND',
    409: 'DUPLICATE',
    412: 'VERSION_CONFLICT',
    428: 'PRECONDITION_REQUIRED',
  };

  if (error.statusCode && statusMap[error.statusCode]) {
    return reply.status(error.statusCode).send({
      success: false,
      code: statusMap[error.statusCode],
      message: error.message,
      data: null,
      requestId,
    });
  }

  // Fallback to 500 for unhandled errors — never expose internal details
  if (error.message) {
    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: INTERNAL_ERROR_MESSAGE,
      data: null,
      requestId,
    });
  }

  throw error;
}

/**
 * Extract and validate If-Match header, returning the decoded upd_date ISO string.
 * Throws with statusCode 428 (missing) or 400 (invalid format).
 *
 * @param {import('fastify').FastifyRequest} request
 * @returns {string}
 */
export function extractUpdDateISO(request) {
  const ifMatch = request.headers['if-match'];
  if (!ifMatch) {
    const error = new Error('If-Match header is required for this operation.');
    error.statusCode = 428;
    throw error;
  }

  const updDateISO = decodeEtag(ifMatch);
  if (!updDateISO) {
    const error = new Error('Invalid If-Match ETag format.');
    error.statusCode = 400;
    throw error;
  }

  return updDateISO;
}
