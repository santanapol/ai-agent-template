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
