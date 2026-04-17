/**
 * @param {import('http').IncomingHttpHeaders} headers
 */
function firstHeader (headers, name) {
  const v = headers[name]
  if (Array.isArray(v)) {
    return typeof v[0] === 'string' ? v[0] : ''
  }
  return typeof v === 'string' ? v : ''
}

/**
 * Trusted user context injected by gateway-service only (never trust client body for identity).
 *
 * @param {import('http').IncomingHttpHeaders} headers
 */
export function buildMeFromTrustedHeaders (headers) {
  const userId = firstHeader(headers, 'x-user-id').trim()
  const role = firstHeader(headers, 'x-user-role').trim()

  if (!userId) {
    const err = new Error('Missing trusted x-user-id')
    err.code = 'MISSING_USER_CONTEXT'
    throw err
  }
  if (userId.length > 128) {
    const err = new Error('x-user-id too long')
    err.code = 'INVALID_USER_CONTEXT'
    throw err
  }
  if (role.length > 256) {
    const err = new Error('x-user-role too long')
    err.code = 'INVALID_USER_CONTEXT'
    throw err
  }

  return {
    userId,
    role: role.length > 0 ? role : null
  }
}
