/**
 * Maps `@fastify/reply-from` / undici errors to the gateway-facing status contract
 * (`docs/architecture.md` section 7).
 *
 * @param {unknown} err
 * @returns {number | undefined}
 */
export function mapGatewayClientStatus (err) {
  if (!err || typeof err !== 'object') return undefined

  const code = 'code' in err && err.code !== undefined ? String(err.code) : ''
  const status =
    'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : undefined

  // Undici / Node: connection never established (nothing listening, wrong host/port).
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') return 502

  if (status === 502 || status === 504) return status

  // reply-from maps DNS issues to 503 — contract expects 502 for DNS/connection failures.
  if (status === 503 && code === 'FST_REPLY_FROM_SERVICE_UNAVAILABLE') return 502

  if (
    code === 'FST_REPLY_FROM_GATEWAY_TIMEOUT' ||
    code === 'FST_REPLY_FROM_TIMEOUT' ||
    code === 'FST_REPLY_FROM_HTTP_REQUEST_TIMEOUT' ||
    code === 'FST_REPLY_FROM_HTTP2_REQUEST_TIMEOUT' ||
    code === 'FST_REPLY_FROM_HTTP2_SESSION_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT'
  ) {
    return 504
  }

  if (status === 500) {
    if (code === 'UND_ERR_CONNECT_TIMEOUT') return 504
    if (
      code === 'ECONNRESET' ||
      code === 'UND_ERR_SOCKET' ||
      code === 'FST_REPLY_FROM_INTERNAL_SERVER_ERROR'
    ) {
      return 502
    }
  }

  return undefined
}
