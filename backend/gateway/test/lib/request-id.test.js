import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { resolveRequestId } from '../../src/lib/request-id.js'

const VALID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

describe('resolveRequestId', () => {
  test('accepts lowercase UUID v4 from header', () => {
    assert.strictEqual(resolveRequestId(VALID), VALID)
    assert.strictEqual(resolveRequestId(VALID.toUpperCase()), VALID)
  })

  test('rejects invalid header and mints UUID v4', () => {
    const id = resolveRequestId('not-a-uuid')
    assert.match(
      String(id),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  test('mints when header missing', () => {
    const id = resolveRequestId(undefined)
    assert.match(
      String(id),
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })
})
