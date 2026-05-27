import { rejectRequest } from '../utils/response.js';
import { assertNoDuplicateHeaders } from './request-id.middleware.js';

export function authMiddleware(req, res, next) {
  const duplicateHeader = assertNoDuplicateHeaders(req);

  if (duplicateHeader) {
    return rejectRequest(res, req, {
      status: 400,
      code: 'INVALID_HEADER',
      message: `Duplicate header: ${duplicateHeader}`,
    });
  }

  const secret = req.headers['x-gateway-secret'];
  const expected = process.env.GATEWAY_SECRET;

  if (!secret || !expected || secret !== expected) {
    return rejectRequest(res, req, {
      status: 401,
      code: 'GATEWAY_SECRET_REJECTED',
      message: 'Authentication failed',
    });
  }

  next();
}
