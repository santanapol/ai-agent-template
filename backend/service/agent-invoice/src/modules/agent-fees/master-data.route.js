import { requirePermission } from "../../lib/require-permission.js";
import * as controller from "./master-data.controller.js";

const ouIdQuerySchema = {
  querystring: {
    type: "object",
    properties: {
      ou_id: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
    },
  },
};

export default async function masterDataRoute(fastify, _options) {
  fastify.get(
    "/game-companies",
    {
      schema: ouIdQuerySchema,
      preHandler: requirePermission("agents:fees"),
    },
    controller.getGameCompaniesHandler,
  );
  fastify.get(
    "/game-categories",
    {
      schema: ouIdQuerySchema,
      preHandler: requirePermission("agents:fees"),
    },
    controller.getGameCategoriesHandler,
  );
}
