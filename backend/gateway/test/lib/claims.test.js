import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import {
  assertValidRoleHeader,
  assertValidUserIdHeader,
  normalizeRoleHeader,
  normalizeUserIdClaim
} from '../../src/lib/claims.js'

describe('claims', () => {
  test('normalizeUserIdClaim throws when missing', () => {
    assert.throws(() => normalizeUserIdClaim(undefined), /missing_user_id/)
  })

  test('assertValidUserIdHeader rejects non-printable ASCII', () => {
    assert.throws(() => assertValidUserIdHeader('bad\nid'), /user_id_not_ascii_printable/)
  })

  test('normalizeRoleHeader supports arrays', () => {
    assert.strictEqual(normalizeRoleHeader([' a ', 'b']), 'a,b')
  })

  test('assertValidRoleHeader rejects too long role header', () => {
    assert.throws(() => assertValidRoleHeader('x'.repeat(257)), /role_too_long/)
  })
})
