import { isValidObjectId } from '../../lib/object-id.js';
import { resolveRequestId } from '../../lib/request-id.js';
import { sendError } from '../../lib/response.js';
import {
  getAgentsSchema,
  getAgentDetailSchema,
  createAgentSchema,
  updateAgentSchema,
  deleteAgentSchema,
  syncAgentSchema,
  getUnsyncedBranchesSchema
} from './agents.schema.js';
import * as controller from './agents.controller.js';

export default async function agentsRoute(fastify, options) {
  fastify.addHook('onRequest', async (request, reply) => {
    const requestId = resolveRequestId(request.headers['x-request-id']);
    const userOu = request.headers['x-user-ou'];

    if (!userOu || !isValidObjectId(String(userOu))) {
      return sendError(reply, {
        statusCode: 403,
        code: 'INVALID_USER_CONTEXT',
        message: 'Invalid user context',
        requestId,
      });
    }
  });

  // GET /api/v1/agent-invoice/agents
  fastify.get(
    '/',
    { schema: getAgentsSchema },
    controller.getAgentsHandler
  );

  // GET /api/v1/agent-invoice/agents/:id
  fastify.get(
    '/:id',
    { schema: getAgentDetailSchema },
    controller.getAgentDetailHandler
  );

  // POST /api/v1/agent-invoice/agents
  fastify.post(
    '/',
    { schema: createAgentSchema },
    controller.createAgentHandler
  );

  // PUT /api/v1/agent-invoice/agents/:id
  fastify.put(
    '/:id',
    { schema: updateAgentSchema },
    controller.updateAgentHandler
  );

  // DELETE /api/v1/agent-invoice/agents/:id
  fastify.delete(
    '/:id',
    { schema: deleteAgentSchema },
    controller.deleteAgentHandler
  );

  // POST /api/v1/agent-invoice/agents/sync
  fastify.post(
    '/sync',
    { schema: syncAgentSchema },
    controller.syncAgentHandler
  );

  // GET /api/v1/agent-invoice/agents/unsynced
  fastify.get(
    '/unsynced',
    { schema: getUnsyncedBranchesSchema },
    controller.getUnsyncedBranchesHandler
  );
}
