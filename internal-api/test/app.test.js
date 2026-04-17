import { describe, expect, test, beforeAll } from '@jest/globals'
import request from 'supertest'
import { buildApp } from '../src/app.js'

describe('internal-api', () => {
  const secret = 'test-gateway-secret-32-chars-minimum!!'
  /** @type {import('express').Express} */
  let app

  beforeAll(async () => {
    app = buildApp({
      PORT: 4010,
      GATEWAY_SECRET: secret,
      TRUST_PROXY: false
    })
  })

  test('GET /health succeeds without x-gateway-secret', async () => {
    const res = await request(app).get('/health').expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.code).toBe('SUCCESS')
    expect(res.body.data?.status).toBe('ok')
    expect(typeof res.body.data?.uptime).toBe('number')
  })

  test('GET /api/v1/me without secret → 403', async () => {
    const res = await request(app).get('/api/v1/me').expect(403)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('FORBIDDEN')
    expect(res.body.data).toBe(null)
  })

  test('GET /api/v1/me with wrong secret → 403', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('x-gateway-secret', 'wrong-secret')
      .expect(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  test('GET /api/v1/me with valid secret and headers → 200', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('x-gateway-secret', secret)
      .set('x-user-id', 'user-123')
      .set('x-user-role', 'admin')
      .set('x-request-id', 'req-test-1')
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toEqual({
      userId: 'user-123',
      role: 'admin'
    })
    expect(res.body.requestId).toBe('req-test-1')
  })

  test('GET /api/v1/me with valid secret but missing x-user-id → 400', async () => {
    const res = await request(app)
      .get('/api/v1/me')
      .set('x-gateway-secret', secret)
      .expect(400)
    expect(res.body.success).toBe(false)
    expect(res.body.code).toBe('INVALID_PARAM')
  })
})
