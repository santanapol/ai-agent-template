import { randomUUID } from 'node:crypto'

/** RFC 4122 UUID v4, lowercase (SoT: `x-request-id` tracing). */
const UUID_V4_LOWERCASE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/**
 * @param {string | string[] | undefined} headerValue
 * @returns {string}
 */
export function resolveRequestId(headerValue) {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue
  if (typeof raw === 'string') {
    const id = raw.trim().toLowerCase()
    if (UUID_V4_LOWERCASE.test(id)) return id
  }
  return randomUUID()
}

/**
 * Fastify `genReqId` — trust inbound `x-request-id` when valid, else mint UUID v4.
 * @param {import('fastify').FastifyRequest} req
 */
export function genRequestId(req) {
  return resolveRequestId(req.headers['x-request-id'])
}
