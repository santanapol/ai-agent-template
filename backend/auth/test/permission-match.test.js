import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isWildcardEntry,
  matchesPermission,
  anyPermissionMatches
} from '../src/lib/permission-match.js'

test('isWildcardEntry accepts only the domain:* form', () => {
  assert.equal(isWildcardEntry('profiles:*'), true)
  assert.equal(isWildcardEntry('profiles:create'), false)
  assert.equal(isWildcardEntry('*'), false)
  assert.equal(isWildcardEntry(':*'), false)
  assert.equal(isWildcardEntry('pro*:*'), false)
  assert.equal(isWildcardEntry('profiles:*:create'), false)
  assert.equal(isWildcardEntry(''), false)
  assert.equal(isWildcardEntry(null), false)
})

test('matchesPermission matches exact action key', () => {
  assert.equal(matchesPermission('profiles:create', 'profiles:create'), true)
  assert.equal(matchesPermission('profiles:create', 'profiles:list'), false)
})

test('matchesPermission wildcard covers all actions in the domain', () => {
  assert.equal(matchesPermission('profiles:*', 'profiles:create'), true)
  assert.equal(matchesPermission('profiles:*', 'profiles:list'), true)
})

test('matchesPermission wildcard does not cross domains', () => {
  assert.equal(matchesPermission('profiles:*', 'profile:create'), false)
  assert.equal(matchesPermission('profiles:*', 'invoice:read'), false)
  assert.equal(matchesPermission('profiles:*', 'profiles'), false)
  assert.equal(matchesPermission('profiles:*', 'profiles:'), false)
})

test('matchesPermission rejects unsupported wildcard forms as literals', () => {
  assert.equal(matchesPermission('*', 'profiles:create'), false)
  assert.equal(matchesPermission('pro*:*', 'profiles:create'), false)
  assert.equal(matchesPermission('profiles:*', 'profiles:*'), false)
})

test('matchesPermission rejects non-string input', () => {
  assert.equal(matchesPermission(null, 'profiles:create'), false)
  assert.equal(matchesPermission('profiles:*', null), false)
  assert.equal(matchesPermission(undefined, undefined), false)
})

test('anyPermissionMatches checks entries with mixed exact and wildcard', () => {
  const entries = ['invoice:read', 'profiles:*']
  assert.equal(anyPermissionMatches(entries, 'profiles:create'), true)
  assert.equal(anyPermissionMatches(entries, 'invoice:read'), true)
  assert.equal(anyPermissionMatches(entries, 'invoice:create'), false)
})

test('anyPermissionMatches returns false for empty or invalid entries', () => {
  assert.equal(anyPermissionMatches([], 'profiles:create'), false)
  assert.equal(anyPermissionMatches(null, 'profiles:create'), false)
})
