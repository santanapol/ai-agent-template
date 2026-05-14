#!/usr/bin/env node
/**
 * E2E: login ที่ auth → เรียก gateway พร้อม Bearer → upstream (**crud-service**)
 *
 * ต้องรัน concurrently:
 *   1) auth (เช่น :3001)
 *   2) `cd .demo/crud-service` แล้ว `npm run dev` (:3003 — ดู `.demo/crud-service/.env.example`)
 *   3) gateway `npm start` (:3002 + `ROUTES_JSON` ชี้ upstream :3003 สำหรับ `/api` + `/api/v1/items`, `GATEWAY_SECRET` ตรงกัน)
 *
 * ทางเลือก mock เดิม: `npm run dev:upstream` (:4000) + `TRY_PROXY_PATH=/api/ping`
 *
 * Env (optional):
 *   TRY_AUTH_URL=http://127.0.0.1:3001
 *   TRY_GATEWAY_URL=http://127.0.0.1:3002
 *   TRY_PROXY_PATH=/api/v1/me
 *   TRY_LOGIN_USERNAME / TRY_LOGIN_PASSWORD — default จาก seed:example
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const authBase = (process.env.TRY_AUTH_URL ?? 'http://127.0.0.1:3001').replace(/\/+$/u, '')
const gatewayBase = (process.env.TRY_GATEWAY_URL ?? 'http://127.0.0.1:3002').replace(/\/+$/u, '')
const proxyPath = process.env.TRY_PROXY_PATH ?? '/api/v1/me'

const username = process.env.TRY_LOGIN_USERNAME ?? 'demo'
const password = process.env.TRY_LOGIN_PASSWORD ?? 'DevExample-demo-1'

async function readExampleLoginBody () {
  const here = dirname(fileURLToPath(import.meta.url))
  const examplePath = join(here, '../../auth/examples/login-native.body.json')
  try {
    const raw = await readFile(examplePath, 'utf8')
    const j = JSON.parse(raw)
    return {
      username: j.username ?? username,
      password: j.password ?? password,
      client_kind: j.client_kind ?? 'native'
    }
  } catch {
    return { username, password, client_kind: 'native' }
  }
}

const loginBody = await readExampleLoginBody()

console.log(`POST ${authBase}/auth/login (user=${loginBody.username})`)
const loginRes = await fetch(`${authBase}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(loginBody)
})
const loginText = await loginRes.text()
if (!loginRes.ok) {
  console.error(`Login failed HTTP ${loginRes.status}:`, loginText.slice(0, 2000))
  process.exit(1)
}

/** @type {{ access_token?: string }} */
let loginJson
try {
  loginJson = JSON.parse(loginText)
} catch {
  console.error('Login response is not JSON:', loginText.slice(0, 500))
  process.exit(1)
}

const token = loginJson.access_token
if (!token || typeof token !== 'string') {
  console.error('No access_token in login response:', Object.keys(loginJson))
  process.exit(1)
}

const path = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`
const gatewayUrl = `${gatewayBase}${path}`
console.log(`GET ${gatewayUrl} (Authorization: Bearer …)`)

const proxied = await fetch(gatewayUrl, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: 'application/json'
  }
})
const bodyText = await proxied.text()

console.log(`HTTP ${proxied.status}`)
console.log(bodyText)

if (!proxied.ok && (proxied.status === 502 || proxied.status === 504)) {
  console.error(
    '\nHint: upstream ไม่ขึ้นหรือ ROUTES_JSON ไม่ตรง path — ตัวอย่าง crud-service upstream (.demo/crud-service):\n' +
      '  ROUTES_JSON=[{"prefix":"/api","upstream":"http://127.0.0.1:3003","stripPrefix":false}]\n' +
      'และ GATEWAY_SECRET ต้องตรงกับ crud-service (`GATEWAY_SHARED_SECRET`)'
  )
}

if (!proxied.ok) {
  process.exit(1)
}
