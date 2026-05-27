import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { GATEWAY_ERROR_DEF } from '../../src/lib/gateway-problems.js'

describe('GATEWAY_ERROR_DEF registry', () => {
  test('GATEWAY_ROUTE_NOT_CONFIGURED is 502 for operator misconfiguration (reserved for runtime or doc alignment)', () => {
    const def = GATEWAY_ERROR_DEF.GATEWAY_ROUTE_NOT_CONFIGURED
    assert.notStrictEqual(def, undefined)
    assert.strictEqual(def.status, 502)
    assert.match(String(def.title), /misconfigured/u)
  })
})
