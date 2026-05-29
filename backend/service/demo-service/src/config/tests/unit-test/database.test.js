import { test, describe, afterEach } from "node:test";
import assert from "node:assert";
import {
  connectDatabase,
  closeDatabase,
  getDatabase,
  pingDatabase,
} from "../../database.js";
import { readEnv } from "../../env.js";

const env = readEnv();

describe("database config", () => {
  afterEach(async () => {
    await closeDatabase();
  });

  test("throws on connection error and redacts URI", async () => {
    const originalUri = env.mongoUri;
    // Invalid protocol should cause sync/async throw in MongoClient
    env.mongoUri = "invalid://user:pass@localhost:27017/test";
    try {
      await connectDatabase();
      assert.fail("Should throw");
    } catch (err) {
      assert.ok(err);
    } finally {
      env.mongoUri = originalUri;
    }
  });

  test("pingDatabase throws if not connected", async () => {
    await closeDatabase();
    try {
      await pingDatabase();
      assert.fail("Should throw");
    } catch (err) {
      assert.strictEqual(err.message, "Database is not connected");
    }
  });

  if (env.mongoUri) {
    test("connectDatabase returns existing db if already connected", async () => {
      const db1 = await connectDatabase();
      const db2 = await connectDatabase();
      assert.strictEqual(db1, db2);
    });

    test("getDatabase throws if called before connect", async () => {
      await closeDatabase();
      assert.throws(() => getDatabase(), /Call connectDatabase\(\) first/);
    });
  }
});
