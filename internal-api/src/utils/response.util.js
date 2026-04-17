/**
 * Response envelope — `engineering-standards/active/backend/api/api-response-standard.md`
 *
 * @param {import('express').Response} res
 * @param {number} httpStatus
 * @param {boolean} success
 * @param {string} code
 * @param {string | null} message
 * @param {unknown} data
 * @param {string} [requestId]
 */
export function sendEnvelope (res, httpStatus, success, code, message, data, requestId) {
  /** @type {Record<string, unknown>} */
  const body = {
    success,
    code,
    message: message ?? null,
    data: data ?? null
  }
  if (requestId) {
    body.requestId = requestId
  }
  res.status(httpStatus).json(body)
}

/**
 * @param {import('express').Request} req
 */
export function getRequestId (req) {
  const raw = req.get('x-request-id')
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim().slice(0, 128)
  }
  return undefined
}
