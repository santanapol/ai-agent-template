const ASCII_PRINTABLE = /^[\u0020-\u007E]+$/u

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeUserIdClaim(value) {
  if (value === undefined || value === null) {
    throw new Error('missing_user_id')
  }
  return String(value)
}

/**
 * @param {string} userId
 */
export function assertValidUserIdHeader(userId) {
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
export function normalizeRoleHeader(value) {
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
export function assertValidRoleHeader(roleHeader) {
  if (roleHeader.length > 256) {
    throw new Error('role_too_long')
  }
}

/**
 * Normalizes tenant claims (like ou_id, branch_id) to a string.
 * Returns empty string if missing or invalid.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeTenantClaim(value) {
  if (value === undefined || value === null || value === '') {
    return ''
  }
  return String(value).trim()
}

/**
 * Normalizes permissions claim (array of permission strings) to comma-separated header.
 * Returns empty string if missing/null/empty array.
 * Validates each entry: no commas, ASCII printable, max 256 chars total.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizePermissionsClaim(value) {
  if (value === undefined || value === null) {
    return ''
  }
  if (!Array.isArray(value)) {
    throw new Error('permissions_not_array')
  }
  if (value.length === 0) {
    return ''
  }
  const parts = []
  for (const v of value) {
    const str = String(v).trim()
    if (!str) continue
    if (str.includes(',')) {
      throw new Error('permissions_entry_contains_comma')
    }
    if (!ASCII_PRINTABLE.test(str)) {
      throw new Error('permissions_entry_not_ascii_printable')
    }
    if (str.length > 256) {
      throw new Error('permissions_entry_too_long')
    }
    parts.push(str)
  }
  const header = parts.join(',')
  if (header.length > 4096) {
    throw new Error('permissions_header_too_long')
  }
  return header
}

/**
 * Validates that a normalized permissions header doesn't exceed limits.
 * (Detailed validation already done in normalizePermissionsClaim.)
 * @param {string} permissionsHeader Comma-separated permissions string
 */
export function assertValidPermissionsHeader(permissionsHeader) {
  if (permissionsHeader.length > 4096) {
    throw new Error('permissions_header_too_long')
  }
}
