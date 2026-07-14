import { getDatabase } from "../../config/database.js";
import { createReferringMembersController } from "./referring-members.controller.js";
import { createReferringMembersRepository } from "./referring-members.repository.js";
import { referringMembersListSchema } from "./referring-members.schema.js";
import { createReferringMembersService } from "./referring-members.service.js";

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ getDb?: () => import('mongodb').Db }} [options]
 */
export async function registerReferringMembersRoutes(app, options = {}) {
  const getDb = options.getDb ?? (() => getDatabase());
  const repository = createReferringMembersRepository(getDb);
  const service = createReferringMembersService(repository);
  const controller = createReferringMembersController(service);

  app.get(
    "/api/v1/branch-report/referring-members",
    {
      schema: referringMembersListSchema,
    },
    controller.list.bind(controller),
  );
}
