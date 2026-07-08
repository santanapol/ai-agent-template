import { getDatabase } from "../../config/database.js";
import { createInviteLinksRepository } from "../invite-links/invite-links.repository.js";
import { createRoyalty21TimesController } from "./royalty-21-times.controller.js";
import { createRoyalty21TimesRepository } from "./royalty-21-times.repository.js";
import { royalty21TimesQuerySchema } from "./royalty-21-times.schema.js";
import { createRoyalty21TimesService } from "./royalty-21-times.service.js";

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ getDb?: () => import('mongodb').Db }} [options]
 */
export async function registerRoyalty21TimesRoutes(app, options = {}) {
  const getDb = options.getDb ?? (() => getDatabase());
  const repository = createRoyalty21TimesRepository(getDb);
  const inviteLinksRepository = createInviteLinksRepository(getDb);
  const service = createRoyalty21TimesService(
    repository,
    inviteLinksRepository,
  );
  const controller = createRoyalty21TimesController(service);

  app.get(
    "/api/v1/branch-report/royalty-21-times",
    {
      schema: royalty21TimesQuerySchema,
    },
    controller.list.bind(controller),
  );
}
