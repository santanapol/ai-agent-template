import { buildMeFromTrustedHeaders } from './me.service.js'
import { getRequestId, sendEnvelope } from '../../utils/response.util.js'

export function getMe (req, res) {
  try {
    const data = buildMeFromTrustedHeaders(req.headers)
    sendEnvelope(res, 200, true, 'SUCCESS', null, data, getRequestId(req))
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    if (code === 'MISSING_USER_CONTEXT' || code === 'INVALID_USER_CONTEXT') {
      return sendEnvelope(
        res,
        400,
        false,
        'INVALID_PARAM',
        err instanceof Error ? err.message : 'Invalid gateway context',
        null,
        getRequestId(req)
      )
    }
    sendEnvelope(
      res,
      500,
      false,
      'INTERNAL_ERROR',
      'Internal server error',
      null,
      getRequestId(req)
    )
  }
}
