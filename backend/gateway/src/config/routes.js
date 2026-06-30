import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
export function loadRoutes(env) {
  const raw =
    env.ROUTES_FILE && String(env.ROUTES_FILE).trim() !== ''
      ? readFileSync(resolve(String(env.ROUTES_FILE)), 'utf8')
      : String(env.ROUTES_JSON)

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    const err = new Error('ROUTES_JSON / ROUTES_FILE must contain valid JSON')
    err.cause = e
    throw err
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Invalid routes config: must be a non-empty array')
  }

  const normalized = []
  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i]
    if (typeof r !== 'object' || r === null) {
      throw new Error(`Invalid routes config: item at index ${i} must be an object`)
    }
    if (typeof r.prefix !== 'string' || !r.prefix.startsWith('/')) {
      throw new Error(
        `Invalid routes config: item at index ${i} prefix is required and must start with /`
      )
    }
    if (typeof r.upstream !== 'string' || !/^https?:\/\//i.test(r.upstream)) {
      throw new Error(
        `Invalid routes config: item at index ${i} upstream must be a valid http(s) URL`
      )
    }

    let timeoutMs
    if (r.timeoutMs !== undefined && r.timeoutMs !== null) {
      timeoutMs = Number(r.timeoutMs)
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error(
          `Invalid routes config: item at index ${i} timeoutMs must be a positive number`
        )
      }
    }

    normalized.push({
      prefix: r.prefix.replace(/\/+$/u, '') || '/',
      upstream: r.upstream.replace(/\/+$/u, ''),
      stripPrefix: typeof r.stripPrefix === 'boolean' ? r.stripPrefix : true,
      isPublic: typeof r.isPublic === 'boolean' ? r.isPublic : false,
      ...(timeoutMs !== undefined ? { timeoutMs } : {})
    })
  }

  const sorted = [...normalized].sort((a, b) => b.prefix.length - a.prefix.length)

  const seen = new Set()
  for (const r of sorted) {
    if (seen.has(r.prefix)) {
      throw new Error(`Duplicate route prefix: ${r.prefix}`)
    }
    seen.add(r.prefix)
  }

  return sorted
}
