import logger from "./config/logger.js";
import { readEnv } from "./config/env.js";
import { connectDatabase, closeDatabase } from "./config/database.js";
import createApp from "./app.js";

const env = readEnv();
let app;

async function start() {
  await connectDatabase();
  logger.info({ dbName: env.dbName }, "mongodb database selected");

  app = await createApp(env);
  await app.listen({ port: env.port, host: "0.0.0.0" });
  logger.info({ port: env.port }, "staff-service listening");
}

async function shutdown(signal) {
  logger.info({ signal }, "shutdown signal received");
  const timeout = setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, env.shutdownTimeoutMs);

  try {
    if (app) {
      await app.close();
    }
    await closeDatabase();
    clearTimeout(timeout);
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    logger.error({ err: error }, "shutdown failed");
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.fatal({ err: error }, "unhandled rejection");
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, "failed to start");
  process.exit(1);
});
