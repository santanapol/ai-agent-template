import { getFeesSchema, createFeeSchema } from './agent-fees.schema.js';
import * as controller from './agent-fees.controller.js';

export default async function agentFeesRoute(fastify, options) {
  // GET /api/v1/agents/:agentId/fees
  fastify.get(
    '/:agentId/fees',
    { schema: getFeesSchema },
    controller.getFeesHandler
  );

  // POST /api/v1/agents/:agentId/fees
  fastify.post(
    '/:agentId/fees',
    { schema: createFeeSchema },
    controller.createFeeHandler
  );
}
