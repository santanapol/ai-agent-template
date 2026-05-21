"use strict";

const { MongoClient } = require("mongodb");
const logger = require("./logger");

let client;
let database;

function redactMongoUri(uri) {
  return uri.replace(/\/\/[^/]*@/, "//***:***@");
}

async function connectDatabase(env) {
  if (database) {
    return database;
  }

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  client = new MongoClient(env.mongoUri, {
    appName: env.appName,
    maxPoolSize: env.maxPoolSize,
    minPoolSize: env.minPoolSize,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    timeoutMS: 30000,
    retryReads: true,
    retryWrites: true,
    readPreference: "primaryPreferred",
    monitorCommands: env.nodeEnv !== "test",
  });

  try {
    await client.connect();
    database = client.db(env.dbName);
    return database;
  } catch (error) {
    logger.error(
      { err: error, mongoUri: redactMongoUri(env.mongoUri) },
      "Failed to connect database",
    );
    throw error;
  }
}

function getDatabase() {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
}

async function closeDatabase() {
  if (client) {
    await client.close();
  }
  client = undefined;
  database = undefined;
}

async function pingDatabase(timeoutMs = 1000) {
  if (!database) {
    throw new Error("Database is not connected");
  }

  await Promise.race([
    database.admin().command({ ping: 1 }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Mongo ping timeout")), timeoutMs);
    }),
  ]);
}

module.exports = {
  connectDatabase,
  getDatabase,
  closeDatabase,
  pingDatabase,
};
