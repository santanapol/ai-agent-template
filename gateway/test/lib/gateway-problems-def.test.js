import { describe, expect, test } from '@jest/globals'
import { GATEWAY_ERROR_DEF } from '../../src/lib/gateway-problems.js'

describe('GATEWAY_ERROR_DEF registry', () => {
  test('GATEWAY_ROUTE_NOT_CONFIGURED is 502 for operator misconfiguration (reserved for runtime or doc alignment)', () => {
    const def = GATEWAY_ERROR_DEF.GATEWAY_ROUTE_NOT_CONFIGURED
    expect(def).toBeDefined()
    expect(def.status).toBe(502)
    expect(def.title).toMatch(/misconfigured/u)
  })
})
