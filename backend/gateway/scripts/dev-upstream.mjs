#!/usr/bin/env node
/**
 * Mock internal API สำหรับ dev — ฟัง path ที่ gateway strip prefix แล้วส่งมา
 *
 *   UPSTREAM_PORT=4000 node scripts/dev-upstream.mjs
 */
import { createServer } from 'node:http'

const port = Number(process.env.UPSTREAM_PORT ?? 4000)
const host = process.env.UPSTREAM_HOST ?? '127.0.0.1'

const server = createServer((req, res) => {
  const secret = req.headers['x-gateway-secret']
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(
    JSON.stringify(
      {
        via: 'dev-upstream',
        method: req.method,
        url: req.url,
        'x-user-id': req.headers['x-user-id'] ?? null,
        'x-user-role': req.headers['x-user-role'] ?? null,
        'x-request-id': req.headers['x-request-id'] ?? null,
        'x-gateway-secret-length': typeof secret === 'string' ? secret.length : 0,
        hasAuthorization: Boolean(req.headers.authorization)
      },
      null,
      2
    )
  )
})

server.listen(port, host, () => {
  console.log(`dev-upstream listening on http://${host}:${port}`)
})
