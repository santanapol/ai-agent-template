"use strict";

const { loadLocalEnv } = require("./config/load-local-env");
loadLocalEnv();

const logger = require("./config/logger");
const { readEnv } = require("./config/env");
const { connectDatabase, closeDatabase } = require("./config/database");
const createApp = require("./app");

const env = readEnv();
const app = createApp(env);
let server;

async function start() {
  await connectDatabase(env);
  logger.info({ dbName: env.dbName }, "mongodb database selected");

  server = app.listen(env.port, () => {
    logger.info({ port: env.port }, "crud-service listening");
  });
  server.requestTimeout = env.requestTimeoutMs;
}

async function shutdown(signal) {
  logger.info({ signal }, "shutdown signal received");
  const timeout = setTimeout(() => {
    logger.error("Forced shutdown due to timeout");
    process.exit(1);
  }, env.shutdownTimeoutMs);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
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

void start();
