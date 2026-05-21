import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from '@jest/globals'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

/** Minimal parse: first `info:` block, then `  version:` (OpenAPI root). */
function readInfoVersion(yamlPath) {
  const text = readFileSync(yamlPath, 'utf8')
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

describe('openapi package version alignment', () => {
  test('openapi.yaml info.version matches package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    const v = readInfoVersion(join(root, 'openapi.yaml'))
    expect(v).toBe(pkg.version)
  })
})
