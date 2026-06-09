import fp from "fastify-plugin";

import {
  closeReadDatabase,
  connectReadDatabase,
} from "../config/database-read.js";

async function mongodbReadPlugin(fastify) {
  await connectReadDatabase();
  fastify.addHook("onClose", async () => {
    await closeReadDatabase();
  });
}

export default fp(mongodbReadPlugin, { name: "mongodb-read" });
