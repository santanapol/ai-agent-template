#!/usr/bin/env node
/**
 * สร้างไฟล์ `.env` สำหรับ local dev จาก `.env.example` และสร้าง RSA PKCS#8 ใหม่ (ไม่ commit).
 * ใช้: node scripts/create-dev-env.mjs
 *       node scripts/create-dev-env.mjs --force   # เขียนทับ `.env` เดิม
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { generateKeyPairSync } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const examplePath = join(root, '.env.example')
const envPath = join(root, '.env')

if (existsSync(envPath) && !process.argv.includes('--force')) {
  console.error('มี `.env` อยู่แล้ว — ถ้าต้องการเขียนทับให้รัน: node scripts/create-dev-env.mjs --force')
  process.exit(1)
}

const pem = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' })
const escaped = String(pem).trim().split('\n').join('\\n')

let content = readFileSync(examplePath, 'utf8')
if (!/^JWT_PRIVATE_KEY_PEM=/mu.test(content)) {
  console.error('ใน `.env.example` ต้องมีบรรทัด JWT_PRIVATE_KEY_PEM=')
  process.exit(1)
}
content = content.replace(/^JWT_PRIVATE_KEY_PEM=\s*$/mu, `JWT_PRIVATE_KEY_PEM=${escaped}`)

const firstSection = content.indexOf('# -----------------------------------------------------------------------------')
if (firstSection >= 0) {
  content =
    `# =============================================================================
# auth-service — local .env (สร้างโดย scripts/create-dev-env.mjs — ห้าม commit)
# =============================================================================

` + content.slice(firstSection)
}

writeFileSync(envPath, content, { mode: 0o600 })
console.log(`เขียน ${envPath} แล้ว (RSA 2048 ใหม่ — ใช้เฉพาะ dev)`)
