import { timingSafeSecretEqual } from '../utils/gateway-secret.util.js'
import { getRequestId, sendEnvelope } from '../utils/response.util.js'

/**
 * @param {string} expectedSecret from env GATEWAY_SECRET
 */
export function gatewaySecretMiddleware (expectedSecret) {
  return (req, res, next) => {
    const provided = req.get('x-gateway-secret')
    if (!timingSafeSecretEqual(provided, expectedSecret)) {
      return sendEnvelope(
        res,
        403,
        false,
        'FORBIDDEN',
        'Invalid or missing gateway secret',
        null,
        getRequestId(req)
      )
    }
    next()
  }
}
