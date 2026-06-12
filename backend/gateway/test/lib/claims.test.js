import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import {
  assertValidRoleHeader,
  assertValidUserIdHeader,
  normalizeRoleHeader,
  normalizeUserIdClaim,
  normalizePermissionsClaim
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

  describe('normalizePermissionsClaim', () => {
    test('returns empty string when value is undefined or null', () => {
      assert.strictEqual(normalizePermissionsClaim(undefined), '')
      assert.strictEqual(normalizePermissionsClaim(null), '')
    })

    test('returns empty string when value is an empty array', () => {
      assert.strictEqual(normalizePermissionsClaim([]), '')
    })

    test('joins array of valid strings with comma', () => {
      assert.strictEqual(
        normalizePermissionsClaim(['profiles:*', 'invoice:read']),
        'profiles:*,invoice:read'
      )
    })

    test('throws when value is not an array', () => {
      assert.throws(() => normalizePermissionsClaim('profiles:*'), /invalid_permissions_claim_type/)
      assert.throws(() => normalizePermissionsClaim(123), /invalid_permissions_claim_type/)
      assert.throws(() => normalizePermissionsClaim({}), /invalid_permissions_claim_type/)
    })

    test('throws when array has non-string elements', () => {
      assert.throws(() => normalizePermissionsClaim(['profiles:*', 123]), /invalid_permission_item_type/)
    })

    test('throws when array has empty strings or whitespace-only strings', () => {
      assert.throws(() => normalizePermissionsClaim(['profiles:*', '']), /empty_permission_item/)
      assert.throws(() => normalizePermissionsClaim(['profiles:*', '   ']), /invalid_permission_characters/)
    })

    test('throws when array element contains comma', () => {
      assert.throws(() => normalizePermissionsClaim(['profiles:*,invoice:read']), /invalid_permission_characters/)
    })

    test('throws when array element contains whitespace', () => {
      assert.throws(() => normalizePermissionsClaim(['profiles:* ', 'invoice:read']), /invalid_permission_characters/)
      assert.throws(() => normalizePermissionsClaim(['profiles:*', 'invoice:\tread']), /invalid_permission_characters/)
      assert.throws(() => normalizePermissionsClaim(['profiles:*', 'invoice:\nread']), /invalid_permission_characters/)
    })
  })
})

