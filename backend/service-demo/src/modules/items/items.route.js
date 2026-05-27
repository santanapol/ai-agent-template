import * as controller from "./items.controller.js";
import * as schema from "./items.schema.js";

export default async function itemRoutes(fastify, _options) {
  fastify.get("/", { schema: schema.listSchema }, controller.list);
  fastify.post("/", { schema: schema.createSchema }, controller.create);
  fastify.get("/:itemId", { schema: schema.detailSchema }, controller.detail);
  fastify.put("/:itemId", { schema: schema.replaceSchema }, controller.replace);
  fastify.patch("/:itemId", { schema: schema.patchSchema }, controller.update);
  fastify.delete(
    "/:itemId",
    { schema: schema.removeSchema },
    controller.remove,
  );
}
