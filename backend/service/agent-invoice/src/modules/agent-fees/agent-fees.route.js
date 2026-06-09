import {
  getFeesSchema,
  createFeeSchema,
  updateFeeSchema,
  deleteFeeSchema,
} from "./agent-fees.schema.js";
import * as controller from "./agent-fees.controller.js";

export default async function agentFeesRoute(fastify, options) {
  // GET /api/v1/agent-invoice/agents/:agentId/fees
  fastify.get(
    "/:agentId/fees",
    { schema: getFeesSchema },
    controller.getFeesHandler,
  );

  // POST /api/v1/agent-invoice/agents/:agentId/fees
  fastify.post(
    "/:agentId/fees",
    { schema: createFeeSchema },
    controller.createFeeHandler,
  );

  // PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId
  fastify.patch(
    "/:agentId/fees/:feeId",
    { schema: updateFeeSchema },
    controller.updateFeeHandler,
  );

  // DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId
  fastify.delete(
    "/:agentId/fees/:feeId",
    { schema: deleteFeeSchema },
    controller.deleteFeeHandler,
  );
}
