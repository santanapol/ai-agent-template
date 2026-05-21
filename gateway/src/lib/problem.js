/**
 * RFC 7807 Problem Details + optional `code` — ทุก `code` ที่ส่งให้ client **ต้อง** อยู่ใน `_coding-standards/gateway/codes.yaml`
 * @param {{ type: string, title: string, status: number, detail?: string, code?: string }} p
 */
export function problemPayload({ type, title, status, detail, code }) {
  return {
    type,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(code ? { code } : {})
  }
}

/**
 * @param {string} base
 */
export function problemTypes(base) {
  const b = String(base).replace(/\/$/u, '')
  return {
    gatewayJwt: `${b}/gateway-jwt`,
    gatewayClaim: `${b}/gateway-claim`,
    gatewayUpstream: `${b}/gateway-upstream`,
    gatewayRoute: `${b}/gateway-route`,
    gatewayNotReady: `${b}/gateway-not-ready`
  }
}
