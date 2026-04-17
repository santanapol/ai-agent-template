import { buildHealthData } from './health.service.js'
import { getRequestId, sendEnvelope } from '../../utils/response.util.js'

export function getHealth (req, res) {
  const data = buildHealthData()
  sendEnvelope(res, 200, true, 'SUCCESS', null, data, getRequestId(req))
}
