'use strict';

/**
 * Reject duplicate critical headers per api.md → Duplicate header policy.
 *
 * Express จะ join duplicate header เป็น CSV string โดย default ทำให้ middleware
 * ตัวอื่นเห็นค่าผสมที่ไม่ตั้งใจ (auth bypass, log spoof). ตัวนี้ตรวจ rawHeaders
 * และคืน 400 INVALID_HEADER ทันทีก่อน middleware ตัวอื่นจะใช้ค่า.
 */

const CRITICAL_HEADERS = new Set([
  'x-gateway-secret',
  'x-user-id',
  'x-user-role',
  'x-user-email',
  'x-user-mobile',
  'authorization',
  'content-type',
  'origin',
  'host',
  'if-match',
  'idempotency-key',
]);

function rejectDuplicateCriticalHeaders(req, res, next) {
  const seen = new Map();
  const raw = req.rawHeaders;

  for (let i = 0; i < raw.length; i += 2) {
    const name = raw[i].toLowerCase();
    if (!CRITICAL_HEADERS.has(name)) continue;
    seen.set(name, (seen.get(name) || 0) + 1);
    if (seen.get(name) > 1) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_HEADER',
        message: 'Duplicate critical header is not allowed',
        data: null,
        requestId: req.id,
      });
    }
  }

  return next();
}

module.exports = { rejectDuplicateCriticalHeaders, CRITICAL_HEADERS };
