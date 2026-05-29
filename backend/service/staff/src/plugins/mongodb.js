import fp from "fastify-plugin";
import {
  connectDatabase,
  getDatabase,
  closeDatabase,
} from "../config/database.js";

export default fp(async function mongodbPlugin(fastify) {
  await connectDatabase();
  fastify.decorate("mongoDb", getDatabase());

  fastify.addHook("onClose", async () => {
    await closeDatabase();
  });
});
