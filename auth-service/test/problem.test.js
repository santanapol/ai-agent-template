import { test } from 'node:test'
import assert from 'node:assert/strict'
import { problemTypes } from '../src/lib/problem.js'

test('problemTypes builds URIs', () => {
  const t = problemTypes('https://example.invalid/problems')
  assert.equal(t.invalidCredentials, 'https://example.invalid/problems/invalid-credentials')
})
