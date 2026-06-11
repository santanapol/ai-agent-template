import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  connectDatabase,
  closeDatabase,
  getDatabase,
  pingDatabase,
} from "../../database.js";

describe("config/database", () => {
  afterEach(async () => {
    await closeDatabase();
  });

  test("connectDatabase throws when MONGODB_URI or DB_NAME is missing", async () => {
    const originalDbName = process.env.DB_NAME;
    delete process.env.DB_NAME;
    try {
      await assert.rejects(connectDatabase(), /Missing MONGODB_URI or DB_NAME/);
    } finally {
      if (originalDbName !== undefined) process.env.DB_NAME = originalDbName;
    }
  });

  test("getDatabase throws if called before connect", () => {
    assert.throws(() => getDatabase(), /Call connectDatabase\(\) first/);
  });

  test("pingDatabase throws if not connected", async () => {
    await assert.rejects(pingDatabase(), /Database is not connected/);
  });

  if (process.env.MONGODB_URI && process.env.DB_NAME) {
    test("connectDatabase connects and pingDatabase succeeds", async () => {
      const db = await connectDatabase();
      assert.equal(db.databaseName, process.env.DB_NAME);
      await pingDatabase();
    });

    test("connectDatabase returns the same db instance when already connected", async () => {
      const db1 = await connectDatabase();
      const db2 = await connectDatabase();
      assert.strictEqual(db1, db2);
    });

    test("getDatabase returns the connected db", async () => {
      const connected = await connectDatabase();
      assert.strictEqual(getDatabase(), connected);
    });
  }
});
