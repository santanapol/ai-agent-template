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

import { isValidRole } from '@zero-platform/roles'

/**
 * @param {string} roleHeader
 */
export function assertValidRoleHeader(roleHeader) {
  if (roleHeader.length > 256) {
    throw new Error('role_too_long')
  }
  if (roleHeader === '') {
    throw new Error('missing_role')
  }
  const parts = roleHeader
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    throw new Error('missing_role')
  }
  for (const part of parts) {
    if (!isValidRole(part)) {
      throw new Error('invalid_role')
    }
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
 * Normalizes permissions claim from JWT to a comma-separated list of strings.
 * Throws an error if format is invalid (not array, members not string, empty strings,
 * or members containing commas/whitespace).
 * Returns empty string if value is missing (undefined/null) or empty array.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizePermissionsClaim(value) {
  if (value === undefined || value === null) {
    return ''
  }
  if (!Array.isArray(value)) {
    throw new Error('invalid_permissions_claim_type')
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error('invalid_permission_item_type')
    }
    if (item === '') {
      throw new Error('empty_permission_item')
    }
    if (item.includes(',') || /\s/u.test(item)) {
      throw new Error('invalid_permission_characters')
    }
  }
  return value.join(',')
}
