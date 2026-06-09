import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import dbPlugin from './plugins/db.plugin.js';
import mongodbRead from './plugins/mongodb-read.js';
import mongodbInvoice from './plugins/mongodb-invoice.js';
import apiRateLimit from './plugins/api-rate-limit.js';
import { secretsMatch } from './lib/secret-compare.js';
import agentFeesRoute from './modules/agent-fees/agent-fees.route.js';
import masterDataRoute from './modules/agent-fees/master-data.route.js';
import agentsRoute from './modules/agents/agents.route.js';
import invoicesRoute from './modules/invoices/agent-invoices.route.js';
import { pingInvoiceDatabase } from './config/database-invoice.js';
import { pingReadDatabase } from './config/database-read.js';

const REDACT_PATHS = [
  'req.headers["x-gateway-secret"]',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.token'
];

const CRITICAL_HEADERS = ['x-gateway-secret', 'x-user-ou', 'x-user-branch', 'x-user-id', 'x-user-role'];

export default async function buildApp(opts = {}) {
  const isDev = process.env.NODE_ENV !== 'production';

  const app = Fastify({
    logger: {
      level: isDev ? 'info' : 'warn',
      redact: REDACT_PATHS
    },
    ...opts
  });

  // x-request-id propagation — generate if missing
  app.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id'] || randomUUID();
    request.requestId = requestId;
    reply.header('x-request-id', requestId);
  });

  // Gateway secret + duplicate header guard
  app.addHook('onRequest', async (request, reply) => {
    // Skip health probes
    if (request.url === '/healthz' || request.url === '/readyz') return;

    // Reject duplicate critical headers
    for (const header of CRITICAL_HEADERS) {
      const raw = request.headers[header];
      if (Array.isArray(raw)) {
        return reply.status(400).send({
          success: false,
          code: 'INVALID_HEADER',
          message: `Duplicate header detected: ${header}`,
          data: null,
          requestId: request.requestId
        });
      }
    }

    // Validate gateway secret
    const secret = request.headers['x-gateway-secret'];
    if (!secret || !secretsMatch(String(secret), process.env.GATEWAY_SECRET)) {
      return reply.status(401).send({
        success: false,
        code: 'GATEWAY_SECRET_REJECTED',
        message: 'Authentication failed.',
        data: null,
        requestId: request.requestId
      });
    }
  });

  // Global error handler — normalise Fastify validation errors to response envelope
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId;

    if (error.validation) {
      return reply.status(400).send({
        success: false,
        code: 'INVALID_PARAM',
        message: error.message,
        data: null,
        requestId
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred.',
      data: null,
      requestId
    });
  });

  // Plugins
  await app.register(dbPlugin);
  await app.register(mongodbRead);
  await app.register(mongodbInvoice);
  await app.register(apiRateLimit);

  // Health probes
  app.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  }));

  app.get('/readyz', async (request, reply) => {
    const dependencies = [];

    try {
      await app.db.command({ ping: 1 });
      dependencies.push({ name: 'database', status: 'ok' });
    } catch {
      dependencies.push({ name: 'database', status: 'error' });
    }

    try {
      await pingInvoiceDatabase();
      dependencies.push({ name: 'invoice-database', status: 'ok' });
    } catch {
      dependencies.push({ name: 'invoice-database', status: 'error' });
    }

    try {
      await pingReadDatabase();
      dependencies.push({ name: 'read-database', status: 'ok' });
    } catch {
      dependencies.push({ name: 'read-database', status: 'error' });
    }

    const hasError = dependencies.some((dep) => dep.status === 'error');
    if (hasError) {
      return reply.status(503).send({
        success: false,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Readiness check failed.',
        data: { dependencies },
        requestId: request.requestId
      });
    }

    return { status: 'ok', dependencies };
  });

  // Routes
  await app.register(agentsRoute, { prefix: '/api/v1/agent-invoice/agents' });
  await app.register(agentFeesRoute, { prefix: '/api/v1/agent-invoice/agents' });
  await app.register(masterDataRoute, { prefix: '/api/v1/agent-invoice/master-data' });
  await app.register(invoicesRoute);

  return app;
}
