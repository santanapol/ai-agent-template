import * as controller from "./profiles.controller.js";
import * as schema from "./profiles.schema.js";

export default async function profileRoutes(fastify, _options) {
  if (!fastify.hasContentTypeParser("application/merge-patch+json")) {
    const jsonParser = fastify.getDefaultJsonParser("error", "error");
    fastify.addContentTypeParser(
      "application/merge-patch+json",
      { parseAs: "string" },
      jsonParser,
    );
  }
  fastify.get(
    "/",
    { schema: schema.listOrLookupProfilesSchema },
    controller.listOrLookupProfiles,
  );
  fastify.get(
    "/:profileId",
    { schema: schema.getProfileByIdSchema },
    controller.getProfileById,
  );
  fastify.post(
    "/",
    {
      schema: schema.createProfileSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    controller.createProfile,
  );
  fastify.patch(
    "/:profileId",
    { schema: schema.patchProfileSchema },
    controller.patchProfile,
  );
  fastify.post(
    "/:profileId/archive",
    {
      schema: schema.lifecycleActionSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    controller.archiveProfile,
  );
  fastify.post(
    "/:profileId/restore",
    {
      schema: schema.lifecycleActionSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    controller.restoreProfile,
  );
  fastify.post(
    "/:profileId/password",
    {
      schema: schema.adminPasswordSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    controller.resetProfilePassword,
  );
  fastify.patch(
    "/:profileId/role",
    {
      schema: schema.changeRoleSchema,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    controller.changeProfileRole,
  );
}
