const ASCII_PRINTABLE = /^[\u0020-\u007E]+$/u

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeUserIdClaim (value) {
  if (value === undefined || value === null) {
    throw new Error('missing_user_id')
  }
  return String(value)
}

/**
 * @param {string} userId
 */
export function assertValidUserIdHeader (userId) {
  if (userId.length > 128) {
    throw new Error('user_id_too_long')
  }
  if (!ASCII_PRINTABLE.test(userId)) {
    throw new Error('user_id_not_ascii_printable')
  }
}

/**
 * Maps JWT role claim to a single header string (comma-separated roles, trimmed parts).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeRoleHeader (value) {
  if (value === undefined || value === null) {
    return ''
  }
  if (Array.isArray(value)) {
    const parts = value.map((x) => String(x).trim()).filter(Boolean)
    return parts.join(',')
  }
  return String(value).trim()
}

/**
 * @param {string} roleHeader
 */
export function assertValidRoleHeader (roleHeader) {
  if (roleHeader.length > 256) {
    throw new Error('role_too_long')
  }
}
