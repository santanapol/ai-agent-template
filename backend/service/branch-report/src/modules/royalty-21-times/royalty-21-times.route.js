import { getDatabase } from "../../config/database.js";
import { requirePermission } from "../../lib/require-permission.js";
import { createInviteLinksRepository } from "../invite-links/invite-links.repository.js";
import { createReferringMembersRepository } from "../referring-members/referring-members.repository.js";
import { createRoyalty21TimesController } from "./royalty-21-times.controller.js";
import { createRoyalty21TimesRepository } from "./royalty-21-times.repository.js";
import {
  royalty21DepositMatrixQuerySchema,
  royalty21TimesQuerySchema,
} from "./royalty-21-times.schema.js";
import { createRoyalty21TimesService } from "./royalty-21-times.service.js";

export const CHANNEL_PERFORMANCE_READ_PERMISSION =
  "branch-report:marketing:channel-performance:read";

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ getDb?: () => import('mongodb').Db }} [options]
 */
export async function registerRoyalty21TimesRoutes(app, options = {}) {
  const getDb = options.getDb ?? (() => getDatabase());
  const repository = createRoyalty21TimesRepository(getDb);
  const inviteLinksRepository = createInviteLinksRepository(getDb);
  const referringMembersRepository = createReferringMembersRepository(getDb);
  const service = createRoyalty21TimesService(
    repository,
    inviteLinksRepository,
    referringMembersRepository,
  );
  const controller = createRoyalty21TimesController(service);
  const requireChannelPerformanceRead = requirePermission(
    CHANNEL_PERFORMANCE_READ_PERMISSION,
  );

  app.get(
    "/api/v1/branch-report/royalty-21-times/deposit-matrix",
    {
      schema: royalty21DepositMatrixQuerySchema,
      preHandler: requireChannelPerformanceRead,
    },
    controller.depositMatrix.bind(controller),
  );

  app.get(
    "/api/v1/branch-report/royalty-21-times",
    {
      schema: royalty21TimesQuerySchema,
      preHandler: requireChannelPerformanceRead,
    },
    controller.list.bind(controller),
  );
}
