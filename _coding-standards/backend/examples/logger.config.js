'use strict';

/**
 * Pino logger singleton per observability.md.
 * Reuse this instance ทั่วทั้ง service (ห้ามสร้าง logger ใหม่ใน module).
 */

const pino = require('pino');

const REDACT_PATHS = [
  // request/response headers
  'req.headers["x-gateway-secret"]',
  'req.headers["x-user-mobile"]',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  // request body PII
  'req.body.password',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.secret',
  'req.body.apiKey',
  'req.body.creditCard',
  'req.body.cvv',
  // env / config
  'process.env.MONGO_URI',
  'process.env.REDIS_URL',
  'process.env.GATEWAY_SECRET',
];

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: process.env.APP_NAME,
    version: process.env.APP_VERSION,
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
    remove: false,
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});

module.exports = { logger, REDACT_PATHS };
