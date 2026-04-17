import { describe, expect, test } from '@jest/globals'
import {
  assertValidRoleHeader,
  assertValidUserIdHeader,
  normalizeRoleHeader,
  normalizeUserIdClaim
} from '../../src/lib/claims.js'

describe('claims', () => {
  test('normalizeUserIdClaim throws when missing', () => {
    expect(() => normalizeUserIdClaim(undefined)).toThrow(/missing_user_id/)
  })

  test('assertValidUserIdHeader rejects non-printable ASCII', () => {
    expect(() => assertValidUserIdHeader('bad\nid')).toThrow(/user_id_not_ascii_printable/)
  })

  test('normalizeRoleHeader supports arrays', () => {
    expect(normalizeRoleHeader([' a ', 'b'])).toBe('a,b')
  })

  test('assertValidRoleHeader rejects too long role header', () => {
    expect(() => assertValidRoleHeader('x'.repeat(257))).toThrow(/role_too_long/)
  })
})
