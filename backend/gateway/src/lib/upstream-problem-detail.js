/**
 * Safe client-facing detail when the proxy cannot reach upstream.
 * Must not include workspace paths, demo service names, or hostnames from config.
 *
 * @param {unknown} err
 * @returns {string}
 */
export function upstreamProblemDetail(err) {
  let code = ''
  /** @type {unknown} */
  let cur = err
  for (let i = 0; i < 6 && cur && typeof cur === 'object'; i++) {
    const c = 'code' in cur && cur.code != null ? String(cur.code) : ''
    if (c) {
      code = c
      break
    }
    cur = 'cause' in cur ? cur.cause : null
  }
  const base =
    'The gateway could not reach the upstream HTTP service for this route. Check that the upstream is running and reachable from the gateway, and that the route table points to the correct base URL.'
  if (code === 'ECONNREFUSED') {
    return `${base} (connection refused)`
  }
  if (code === 'ENOTFOUND') {
    return `${base} (upstream hostname could not be resolved)`
  }
  if (code) {
    return `${base} (proxy error code: ${code})`
  }
  return base
}
