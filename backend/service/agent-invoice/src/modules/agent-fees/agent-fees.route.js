import { requirePermission } from "../../lib/require-permission.js";
import {
  getFeesSchema,
  createFeeSchema,
  updateFeeSchema,
  deleteFeeSchema,
} from "./agent-fees.schema.js";
import * as controller from "./agent-fees.controller.js";

export default async function agentFeesRoute(fastify, _options) {
  // GET /api/v1/agent-invoice/agents/:agentId/fees
  fastify.get(
    "/:agentId/fees",
    { schema: getFeesSchema, preHandler: requirePermission("agents:fees") },
    controller.getFeesHandler,
  );

  // POST /api/v1/agent-invoice/agents/:agentId/fees
  fastify.post(
    "/:agentId/fees",
    { schema: createFeeSchema, preHandler: requirePermission("agents:fees") },
    controller.createFeeHandler,
  );

  // PATCH /api/v1/agent-invoice/agents/:agentId/fees/:feeId
  fastify.patch(
    "/:agentId/fees/:feeId",
    { schema: updateFeeSchema, preHandler: requirePermission("agents:fees") },
    controller.updateFeeHandler,
  );

  // DELETE /api/v1/agent-invoice/agents/:agentId/fees/:feeId
  fastify.delete(
    "/:agentId/fees/:feeId",
    { schema: deleteFeeSchema, preHandler: requirePermission("agents:fees") },
    controller.deleteFeeHandler,
  );
}
