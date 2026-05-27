import { randomUUID } from 'node:crypto';

const CRITICAL_HEADERS = [
  'x-gateway-secret',
  'x-user-ou',
  'x-user-branch',
  'x-user-id',
  'x-user-role',
  'if-match',
];

export function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const trimmed = typeof incoming === 'string' ? incoming.trim() : '';
  const requestId = trimmed || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

function hasDuplicateRawHeader(rawHeaders, headerName) {
  if (!Array.isArray(rawHeaders)) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (String(rawHeaders[i]).toLowerCase() === headerName && ++count > 1) {
      return true;
    }
  }

  return false;
}

export function assertNoDuplicateHeaders(req) {
  for (const header of CRITICAL_HEADERS) {
    const value = req.headers[header];

    if (typeof value === 'string' && value.includes(',')) {
      return header;
    }

    if (hasDuplicateRawHeader(req.rawHeaders, header)) {
      return header;
    }
  }

  return null;
}
