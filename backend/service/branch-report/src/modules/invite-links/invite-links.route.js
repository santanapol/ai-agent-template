import { getDatabase } from "../../config/database.js";
import { createInviteLinksController } from "./invite-links.controller.js";
import { createInviteLinksRepository } from "./invite-links.repository.js";
import { inviteLinksListSchema } from "./invite-links.schema.js";
import { createInviteLinksService } from "./invite-links.service.js";

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ getDb?: () => import('mongodb').Db }} [options]
 */
export async function registerInviteLinksRoutes(app, options = {}) {
  const getDb = options.getDb ?? (() => getDatabase());
  const repository = createInviteLinksRepository(getDb);
  const service = createInviteLinksService(repository);
  const controller = createInviteLinksController(service);

  app.get(
    "/api/v1/branch-report/invite-links",
    {
      schema: inviteLinksListSchema,
    },
    controller.list.bind(controller),
  );
}
