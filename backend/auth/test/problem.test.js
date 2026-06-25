import { test } from 'node:test'
import assert from 'node:assert/strict'
import { problemPayload, problemTypes } from '../src/lib/problem.js'
import { codeForProblemType } from '../src/lib/auth-problem-codes.js'

test('problemTypes builds URIs', () => {
  const t = problemTypes('https://example.invalid/problems')
  assert.equal(t.invalidCredentials, 'https://example.invalid/problems/invalid-credentials')
  assert.equal(t.validation, 'https://example.invalid/problems/invalid-request')
  assert.equal(t.invalidToken, 'https://example.invalid/problems/refresh-rejected')
  assert.equal(t.rateLimit, 'https://example.invalid/problems/too-many-attempts')
  assert.equal(t.notReady, 'https://example.invalid/problems/not-ready')
})

test('problemPayload requires and includes code', () => {
  const p = problemPayload({
    type: 'https://example.invalid/t',
    title: 'Error',
    status: 400,
    detail: 'x',
    code: 'AUTH_INVALID_REQUEST'
  })
  assert.equal(p.code, 'AUTH_INVALID_REQUEST')
})

test('branch switch problem types map to registry codes', () => {
  const t = problemTypes('https://example.invalid/problems')
  assert.equal(codeForProblemType(t, t.branchSwitchForbidden), 'AUTH_BRANCH_SWITCH_FORBIDDEN')
  assert.equal(codeForProblemType(t, t.branchForbidden), 'AUTH_BRANCH_FORBIDDEN')
  assert.equal(codeForProblemType(t, t.branchNotFound), 'AUTH_BRANCH_NOT_FOUND')
})
