import { problemPayload } from './problem.js'

/** Response header names aligned with `_coding-standards/auth/api.md` §4. */
export const RATE_LIMIT_HEADER_LABELS = {
  rateLimit: 'X-RateLimit-Limit',
  rateRemaining: 'X-RateLimit-Remaining',
  rateReset: 'X-RateLimit-Reset',
  retryAfter: 'Retry-After'
}

/**
 * Shared `@fastify/rate-limit` options for auth edge + internal routes.
 * @param {Record<string, string>} types — from `problemTypes()`
 */
export function buildRateLimitPluginOptions(types) {
  return {
    global: false,
    addHeaders: {
      [RATE_LIMIT_HEADER_LABELS.rateLimit]: true,
      [RATE_LIMIT_HEADER_LABELS.rateRemaining]: true,
      [RATE_LIMIT_HEADER_LABELS.rateReset]: true,
      [RATE_LIMIT_HEADER_LABELS.retryAfter]: true
    },
    addHeadersOnExceeding: {
      [RATE_LIMIT_HEADER_LABELS.rateLimit]: true,
      [RATE_LIMIT_HEADER_LABELS.rateRemaining]: true,
      [RATE_LIMIT_HEADER_LABELS.rateReset]: true
    },
    labels: RATE_LIMIT_HEADER_LABELS,
    errorResponseBuilder: (_req, context) =>
      problemPayload({
        type: types.rateLimit,
        title: 'Too Many Requests',
        status: 429,
        detail: `Rate limit exceeded, retry in ${context.ttl} seconds.`,
        code: 'AUTH_TOO_MANY_ATTEMPTS'
      })
  }
}
