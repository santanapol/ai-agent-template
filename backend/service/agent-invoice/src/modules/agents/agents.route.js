import { isValidObjectId } from "../../lib/object-id.js";
import { requirePermission } from "../../lib/require-permission.js";
import {
  getAgentsSchema,
  getAgentDetailSchema,
  createAgentSchema,
  updateAgentSchema,
  deleteAgentSchema,
  syncAgentSchema,
  getUnsyncedBranchesSchema,
} from "./agents.schema.js";
import * as controller from "./agents.controller.js";

export default async function agentsRoute(fastify, _options) {
  // GET /api/v1/agent-invoice/agents
  fastify.get(
    "/",
    { schema: getAgentsSchema, preHandler: requirePermission("agents:list") },
    controller.getAgentsHandler,
  );

  // GET /api/v1/agent-invoice/agents/:id
  fastify.get(
    "/:id",
    {
      schema: getAgentDetailSchema,
      preHandler: requirePermission("agents:list"),
    },
    controller.getAgentDetailHandler,
  );

  // POST /api/v1/agent-invoice/agents
  fastify.post(
    "/",
    {
      schema: createAgentSchema,
      preHandler: requirePermission("agents:write"),
    },
    controller.createAgentHandler,
  );

  // PUT /api/v1/agent-invoice/agents/:id
  fastify.put(
    "/:id",
    {
      schema: updateAgentSchema,
      preHandler: requirePermission("agents:write"),
    },
    controller.updateAgentHandler,
  );

  // DELETE /api/v1/agent-invoice/agents/:id
  fastify.delete(
    "/:id",
    {
      schema: deleteAgentSchema,
      preHandler: requirePermission("agents:write"),
    },
    controller.deleteAgentHandler,
  );

  // POST /api/v1/agent-invoice/agents/sync
  fastify.post(
    "/sync",
    { schema: syncAgentSchema, preHandler: requirePermission("agents:write") },
    controller.syncAgentHandler,
  );

  // GET /api/v1/agent-invoice/agents/unsynced
  fastify.get(
    "/unsynced",
    {
      schema: getUnsyncedBranchesSchema,
      preHandler: requirePermission("agents:list"),
    },
    controller.getUnsyncedBranchesHandler,
  );
}
