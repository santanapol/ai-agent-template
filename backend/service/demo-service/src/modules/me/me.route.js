import { getMe } from "./me.controller.js";

export default async function meRoutes(fastify, _options) {
  fastify.get("/", getMe);
}
