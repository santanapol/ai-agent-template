import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** Minimal parse: first `info:` block, then `  version:` (OpenAPI root). */
function readInfoVersion(yamlPath) {
  const text = fs.readFileSync(yamlPath, 'utf8')
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length && lines[i].trim() !== 'info:') {
    i += 1
  }
  if (i >= lines.length) {
    throw new Error(`info: block not found in ${yamlPath}`)
  }
  i += 1
  while (i < lines.length) {
    const line = lines[i]
    if (/^[a-zA-Z]/.test(line) && !line.startsWith(' ')) {
      break
    }
    const m = line.match(/^ {2}version:\s*(.+)$/)
    if (m) {
      const raw = m[1].trim()
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        return raw.slice(1, -1)
      }
      return raw
    }
    i += 1
  }
  throw new Error(`version not found under info in ${yamlPath}`)
}

test('openapi.yaml info.version matches package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const v = readInfoVersion(path.join(root, 'openapi.yaml'))
  assert.equal(v, pkg.version, 'openapi.yaml info.version must match package.json version')
})
