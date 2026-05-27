import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { upstreamProblemDetail } from '../../src/lib/upstream-problem-detail.js'

describe('upstreamProblemDetail', () => {
  test('does not embed demo paths or ROUTES_JSON hints', () => {
    const err = { code: 'ECONNREFUSED' }
    const d = upstreamProblemDetail(err)
    assert.doesNotMatch(String(d), /\.demo/u)
    assert.doesNotMatch(String(d), /crud-service/u)
    assert.doesNotMatch(String(d), /ROUTES_JSON/u)
    assert.match(String(d), /connection refused/u)
  })

  test('includes generic resolution guidance for ENOTFOUND', () => {
    const d = upstreamProblemDetail({ code: 'ENOTFOUND' })
    assert.match(String(d), /hostname could not be resolved/u)
  })
})
