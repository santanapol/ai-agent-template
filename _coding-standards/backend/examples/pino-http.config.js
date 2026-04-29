'use strict';

/**
 * pino-http config per observability.md → HTTP logger.
 * - Generates request id (UUID v7) if missing
 * - Echoes x-request-id back on response
 * - Default level INFO, 4xx WARN, 5xx ERROR
 */

const pinoHttp = require('pino-http');
const { randomUUID } = require('node:crypto');
const { logger } = require('./logger.config');

const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = incoming && /^[0-9a-fA-F-]{8,}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode} (${err.name})`,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      route: req.route?.path,
      userId: req.headers['x-user-id'],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

module.exports = { httpLogger };
