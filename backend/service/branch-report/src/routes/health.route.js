import { sendSuccess } from '../lib/response.js';
import { isDatabaseConnected } from '../config/database.js';

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function registerHealthRoutes(app) {
  app.get('/healthz', async (request, reply) => {
    return sendSuccess(reply, {
      data: { status: 'ok' },
      requestId: request.requestId,
    });
  });

  app.get('/readyz', async (request, reply) => {
    const ready = isDatabaseConnected();
    if (!ready) {
      return reply.status(503).send({
        success: false,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database not connected',
        data: null,
        requestId: request.requestId,
      });
    }

    return sendSuccess(reply, {
      data: { status: 'ready' },
      requestId: request.requestId,
    });
  });
}
