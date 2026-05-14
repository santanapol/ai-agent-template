import { describe, expect, test } from '@jest/globals'
import { upstreamProblemDetail } from '../../src/lib/upstream-problem-detail.js'

describe('upstreamProblemDetail', () => {
  test('does not embed demo paths or ROUTES_JSON hints', () => {
    const err = { code: 'ECONNREFUSED' }
    const d = upstreamProblemDetail(err)
    expect(d).not.toMatch(/\.demo/u)
    expect(d).not.toMatch(/crud-service/u)
    expect(d).not.toMatch(/ROUTES_JSON/u)
    expect(d).toMatch(/connection refused/u)
  })

  test('includes generic resolution guidance for ENOTFOUND', () => {
    const d = upstreamProblemDetail({ code: 'ENOTFOUND' })
    expect(d).toMatch(/hostname could not be resolved/u)
  })
})
