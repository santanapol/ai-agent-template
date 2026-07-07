import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * Absolute path to `gateway/.env` — stable when `process.cwd()` is not the
 * package root (e.g. `npm start` from a monorepo parent).
 */
export const defaultGatewayDotenvPath = resolve(MODULE_DIR, '../../.env')

/**
 * Re-read `ROUTES_JSON` / `ROUTES_FILE` from `.env` and assign `process.env`.
 *
 * Node's `--env-file` does not override variables already set in the shell; devs
 * often export a stale `ROUTES_JSON`. The package `.env` is the SoT for route table.
 *
 * @param {{ envPath?: string }} [opts]
 * @returns {{ kind: 'ROUTES_JSON' | 'ROUTES_FILE' | 'none'; warning?: string }}
 */
export function reapplyRoutesEnvFromDotenvFile(opts = {}) {
  const envPath = opts.envPath ?? defaultGatewayDotenvPath
  if (!existsSync(envPath)) {
    return { kind: 'none' }
  }

  let raw
  try {
    raw = readFileSync(envPath, 'utf8')
  } catch {
    return { kind: 'none' }
  }

  /** @type {string | null} */
  let jsonLine = null
  /** @type {string | null} */
  let fileLine = null

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const jsonMatch = /^\s*ROUTES_JSON\s*=\s*(.*)$/u.exec(line)
    if (jsonMatch) {
      jsonLine = jsonMatch[1]
      continue
    }
    const fileMatch = /^\s*ROUTES_FILE\s*=\s*(.*)$/u.exec(line)
    if (fileMatch) {
      fileLine = fileMatch[1]
    }
  }

  const stripOuterQuotes = (s) => {
    const v = String(s).trim()
    if (v.length >= 2) {
      if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replaceAll('\\"', '"')
      if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replaceAll("\\'", "'")
    }
    return v
  }

  const jsonVal = jsonLine === null ? '' : stripOuterQuotes(jsonLine)
  const fileVal = fileLine === null ? '' : stripOuterQuotes(fileLine)

  if (jsonVal !== '' && fileVal !== '') {
    return {
      kind: 'ROUTES_JSON',
      warning:
        '[gateway] .env defines both ROUTES_JSON and ROUTES_FILE; using ROUTES_JSON (see env rules)'
    }
  }

  if (jsonVal !== '') {
    process.env.ROUTES_JSON = jsonVal
    delete process.env.ROUTES_FILE
    return { kind: 'ROUTES_JSON' }
  }
  if (fileVal !== '') {
    process.env.ROUTES_FILE = fileVal
    delete process.env.ROUTES_JSON
    return { kind: 'ROUTES_FILE' }
  }

  return { kind: 'none' }
}
