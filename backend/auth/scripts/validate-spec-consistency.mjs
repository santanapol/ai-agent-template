#!/usr/bin/env node
/**
 * spec:consistency gate — reference implementation
 * (backend-service-spec-bootstrap Phase 8)
 *
 * COPY this file into <package_root>/scripts/validate-spec-consistency.mjs
 * แล้วปรับเฉพาะ CONFIG ด้านล่างให้ตรง service — อย่าเขียน logic ใหม่เอง
 * (link resolution ต้อง resolve เทียบ "directory ของไฟล์ที่มีลิงก์" ไม่ใช่ spec-root;
 *  logic นั้นทำไว้ถูกแล้วในไฟล์นี้ — เขียนใหม่มักพลาดจุดนี้)
 *
 * fail (exit 1) เมื่อ:
 *   1. broken relative link (.md/.yaml) ใน spec dir — resolve per-file dir
 *   2. password minLength ไม่ตรงกันข้าม markdown / openapi schema / openapi prose / validator
 *   3. role list ใน business-domain prose ≠ VALID_ROLES จาก code
 *
 * wire เข้า package.json:
 *   "spec:consistency": "node scripts/validate-spec-consistency.mjs",
 *   "ci": "... && npm run spec:consistency && npm test"
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, resolve, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(HERE, '..') // scripts/ -> package root

// ─── CONFIG: ปรับต่อ service ─────────────────────────────────────────────
const CONFIG = {
  // SoT spec directory (markdown ทั้งหมดที่ต้องตรวจ)
  specDir: resolve(PKG_ROOT, '../../docs/specs/backend/auth'),
  // OpenAPI contract
  openapi: resolve(PKG_ROOT, 'openapi.yaml'),
  // code source of truth สำหรับ role list — export ชื่อ VALID_ROLES (array ของ string)
  rolesModule: resolve(PKG_ROOT, '../shared/platform-roles/index.js'),
  // heading ใน business-domain ที่เป็นตาราง system roles
  rolesDoc: 'business-domain.md',
  rolesHeadingMatch: /system roles/i
}
// ─────────────────────────────────────────────────────────────────────────

const PW_KEYWORDS = /password|รหัสผ่าน/i
const YAML_SCHEMA_KW = new Set([
  'type',
  'minLength',
  'maxLength',
  'format',
  'pattern',
  'description',
  'example',
  'enum',
  'items',
  'properties',
  'required',
  'nullable',
  'default',
  'minimum',
  'maximum',
  'additionalProperties',
  'oneOf',
  'allOf',
  'anyOf',
  '$ref'
])

const errors = []
const fail = (msg) => errors.push(msg)

function walkMarkdown(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) out.push(...walkMarkdown(p))
    else if (extname(p) === '.md') out.push(p)
  }
  return out
}

// ── check 1: broken relative links (resolve per-file directory) ──────────
function checkLinks(mdFiles) {
  const linkRe = /\]\(([^)]+?\.(?:md|ya?ml))(?:#[^)]*)?\)/g
  for (const file of mdFiles) {
    const text = readFileSync(file, 'utf8')
    let m
    while ((m = linkRe.exec(text)) !== null) {
      const target = m[1]
      if (/^(https?:)?\/\//.test(target)) continue // external
      // KEY: resolve เทียบ dirname(file) — ไม่ใช่ specDir root
      const resolved = resolve(dirname(file), target)
      if (!existsSync(resolved)) {
        const line = text.slice(0, m.index).split('\n').length
        fail(`[link] ${file}:${line} → broken: ${target}`)
      }
    }
  }
}

// ── check 2: password minLength consistency ──────────────────────────────
function scanProsePasswordMins(file) {
  const hits = []
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (!PW_KEYWORDS.test(line)) return
      const m = line.match(/min(?:Length)?[^\d]{0,14}(\d{1,3})/i)
      if (m) hits.push({ file, line: i + 1, val: Number(m[1]), text: line.trim() })
    })
  return hits
}

// openapi schema minLength ของ password field — เฉพาะ policy (val > 1);
// login/current_password ใช้ minLength: 1 โดยตั้งใจ (ไม่ reject ที่ความยาว) จึงข้าม
function scanYamlPasswordMins(file) {
  const hits = []
  let currentKey = null
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const km = line.match(/^\s*([A-Za-z_$]+):/)
      if (km && !YAML_SCHEMA_KW.has(km[1])) currentKey = km[1]
      const mm = line.match(/minLength:\s*(\d+)/)
      if (mm && currentKey && PW_KEYWORDS.test(currentKey) && Number(mm[1]) > 1) {
        hits.push({ file, line: i + 1, val: Number(mm[1]), text: line.trim() })
      }
    })
  return hits
}

// เทียบเฉพาะ "policy claim": prose (md + openapi description) + openapi schema (val>1)
// ไม่ดูด minLength ดิบจาก validator (มี min:1 สำหรับ login/current โดยตั้งใจ + JS object หลายบรรทัด
// parse เปราะ) — openapi schema ถูก sync กับ code โดย spec:lint/tests อยู่แล้ว จึงครอบ code ทางอ้อม
function checkPassword(mdFiles) {
  const hits = [
    ...mdFiles.flatMap(scanProsePasswordMins),
    ...(existsSync(CONFIG.openapi) ? scanProsePasswordMins(CONFIG.openapi) : []),
    ...(existsSync(CONFIG.openapi) ? scanYamlPasswordMins(CONFIG.openapi) : [])
  ]

  const values = [...new Set(hits.map((h) => h.val))]
  if (values.length > 1) {
    fail(
      `[password] policy minLength ไม่ตรงกัน — พบค่า ${values.sort((a, b) => a - b).join(', ')}:`
    )
    for (const h of hits) fail(`    ${h.file}:${h.line} = ${h.val}  «${h.text}»`)
  }
}

// ── check 3: role list prose ↔ VALID_ROLES ───────────────────────────────
async function checkRoles(mdFiles) {
  if (!existsSync(CONFIG.rolesModule)) return
  let validRoles
  try {
    ;({ VALID_ROLES: validRoles } = await import(CONFIG.rolesModule))
  } catch {
    const src = readFileSync(CONFIG.rolesModule, 'utf8')
    validRoles = [...src.matchAll(/["']([a-z][a-z_]+)["']/g)].map((m) => m[1])
  }
  const roleSet = new Set(validRoles)

  const doc = mdFiles.find((f) => f.endsWith(CONFIG.rolesDoc))
  if (!doc) return
  const lines = readFileSync(doc, 'utf8').split('\n')
  const start = lines.findIndex((l) => /^#{2,4}\s/.test(l) && CONFIG.rolesHeadingMatch.test(l))
  if (start === -1) return
  let end = lines.slice(start + 1).findIndex((l) => /^#{2,4}\s/.test(l))
  end = end === -1 ? lines.length : start + 1 + end

  const documented = new Set()
  for (let i = start; i < end; i++) {
    const row = lines[i]
    if (!row.trim().startsWith('|')) continue
    for (const tok of row.matchAll(/[a-z][a-z_]{2,}/g)) documented.add(tok[0])
  }

  const known = [...documented].filter((t) => roleSet.has(t))
  const missing = validRoles.filter((r) => !documented.has(r))
  // ถ้าไม่พบ role identifier แบบ snake_case เลย = ใช้ชื่อ human เก่า (Owner/Admin/…)
  if (known.length === 0) {
    fail(`[roles] ${doc} §"${lines[start].trim()}" ไม่มี role identifier จาก VALID_ROLES เลย`)
    fail(`    code VALID_ROLES = ${validRoles.join(', ')} — prose น่าจะยังใช้ชื่อเก่า`)
  } else if (missing.length) {
    fail(`[roles] ${doc} ขาด role: ${missing.join(', ')} (มีใน code แต่ไม่มีใน prose)`)
  }
}

// ── run ───────────────────────────────────────────────────────────────────
const mdFiles = walkMarkdown(CONFIG.specDir)
checkLinks(mdFiles)
checkPassword(mdFiles)
await checkRoles(mdFiles)

if (errors.length) {
  console.error(`\n✗ spec:consistency — พบ ${errors.length} ปัญหา\n`)
  for (const e of errors) console.error(e)
  console.error('')
  process.exit(1)
}
console.log(`✓ spec:consistency — ${mdFiles.length} md files: links + password + roles ตรงกัน`)
