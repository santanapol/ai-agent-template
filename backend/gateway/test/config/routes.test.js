import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadRoutes } from '../../src/config/routes.js'

test('loadRoutes parses valid routes from ROUTES_JSON', () => {
  const env = {
    ROUTES_JSON: JSON.stringify([
      { prefix: '/api', upstream: 'http://localhost:3000' }
    ])
  }
  const routes = loadRoutes(env)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].prefix, '/api')
  assert.equal(routes[0].upstream, 'http://localhost:3000')
  assert.equal(routes[0].stripPrefix, true)
})

test('loadRoutes strips trailing slashes', () => {
  const env = {
    ROUTES_JSON: JSON.stringify([
      { prefix: '/api///', upstream: 'http://localhost:3000///', stripPrefix: false }
    ])
  }
  const routes = loadRoutes(env)
  assert.equal(routes[0].prefix, '/api')
  assert.equal(routes[0].upstream, 'http://localhost:3000')
  assert.equal(routes[0].stripPrefix, false)
})

test('loadRoutes sorts by prefix length descending', () => {
  const env = {
    ROUTES_JSON: JSON.stringify([
      { prefix: '/api', upstream: 'http://localhost:3000' },
      { prefix: '/api/v1', upstream: 'http://localhost:3000' }
    ])
  }
  const routes = loadRoutes(env)
  assert.equal(routes[0].prefix, '/api/v1')
  assert.equal(routes[1].prefix, '/api')
})

test('loadRoutes throws on invalid JSON', () => {
  const env = { ROUTES_JSON: 'invalid-json' }
  assert.throws(() => loadRoutes(env), /ROUTES_JSON \/ ROUTES_FILE must contain valid JSON/)
})

test('loadRoutes throws if not array', () => {
  const env = { ROUTES_JSON: JSON.stringify({}) }
  assert.throws(() => loadRoutes(env), /must be a non-empty array/)
})

test('loadRoutes throws if empty array', () => {
  const env = { ROUTES_JSON: JSON.stringify([]) }
  assert.throws(() => loadRoutes(env), /must be a non-empty array/)
})

test('loadRoutes throws if item not object', () => {
  const env = { ROUTES_JSON: JSON.stringify(['string']) }
  assert.throws(() => loadRoutes(env), /item at index 0 must be an object/)
})

test('loadRoutes throws if prefix invalid', () => {
  const env = { ROUTES_JSON: JSON.stringify([{ prefix: 'api', upstream: 'http://localhost' }]) }
  assert.throws(() => loadRoutes(env), /prefix is required and must start with \//)
})

test('loadRoutes throws if upstream invalid', () => {
  const env = { ROUTES_JSON: JSON.stringify([{ prefix: '/api', upstream: 'ftp://localhost' }]) }
  assert.throws(() => loadRoutes(env), /upstream must be a valid http\(s\) URL/)
})

test('loadRoutes throws on duplicate prefix', () => {
  const env = {
    ROUTES_JSON: JSON.stringify([
      { prefix: '/api', upstream: 'http://localhost:3000' },
      { prefix: '/api', upstream: 'http://localhost:4000' }
    ])
  }
  assert.throws(() => loadRoutes(env), /Duplicate route prefix: \/api/)
})
