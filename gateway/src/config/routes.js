import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Joi from 'joi'

const routeItemSchema = Joi.object({
  prefix: Joi.string().pattern(/^\//u).required(),
  upstream: Joi.string()
    .uri({ scheme: [/https?/] })
    .required(),
  stripPrefix: Joi.boolean().default(true)
})

const routesSchema = Joi.array().items(routeItemSchema).min(1).required()

/**
 * @param {ReturnType<import('./env.js').loadEnv>} env
 */
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

  const { value, error } = routesSchema.validate(parsed, { abortEarly: false })
  if (error) {
    const msg = error.details.map((d) => d.message).join('; ')
    throw new Error(`Invalid routes config: ${msg}`)
  }

  const normalized = value.map((r) => ({
    prefix: r.prefix.replace(/\/+$/u, '') || '/',
    upstream: String(r.upstream).replace(/\/+$/u, ''),
    stripPrefix: r.stripPrefix !== false
  }))

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
