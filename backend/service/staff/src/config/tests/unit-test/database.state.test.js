import { test, describe, before, after } from "node:test";
import assert from "node:assert";

import {
  connectDatabase,
  closeDatabase,
  getDatabase,
  isDatabaseConnected,
  pingDatabase,
} from "../../database.js";

const initialEnv = process.env.MONGODB_URI;
const RUN = Boolean(initialEnv && initialEnv.trim());

describe("database module", () => {
  before(async () => {
    await closeDatabase();
  });

  after(async () => {
    await closeDatabase();
  });

  test("isDatabaseConnected is false before connect", () => {
    assert.strictEqual(isDatabaseConnected(), false);
  });

  test("getDatabase throws before connect", () => {
    assert.throws(() => getDatabase(), /Call connectDatabase/);
  });

  test("pingDatabase throws before connect", async () => {
    await assert.rejects(() => pingDatabase(), /not connected/);
  });

  if (RUN) {
    test("connectDatabase and ping succeed with MONGODB_URI", async () => {
      const db = await connectDatabase();
      assert.ok(db);
      assert.strictEqual(isDatabaseConnected(), true);
      await pingDatabase(2000);
      await closeDatabase();
      assert.strictEqual(isDatabaseConnected(), false);
    });
  }
});
