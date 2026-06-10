import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  connectReadDatabase,
  closeReadDatabase,
  getReadClient,
  pingReadDatabase,
} from "../../database-read.js";

describe("config/database-read", () => {
  afterEach(async () => {
    await closeReadDatabase();
  });

  test("connectReadDatabase throws when MONGODB_URI_READ is missing", async () => {
    const original = process.env.MONGODB_URI_READ;
    delete process.env.MONGODB_URI_READ;
    try {
      await assert.rejects(connectReadDatabase(), /Missing MONGODB_URI_READ/);
    } finally {
      if (original !== undefined) process.env.MONGODB_URI_READ = original;
    }
  });

  test("getReadClient throws if called before connect", () => {
    assert.throws(() => getReadClient(), /Call connectReadDatabase\(\) first/);
  });

  test("pingReadDatabase throws if not connected", async () => {
    await assert.rejects(pingReadDatabase(), /Database is not connected/);
  });

  if (process.env.MONGODB_URI_READ) {
    test("connectReadDatabase connects and pingReadDatabase succeeds", async () => {
      await connectReadDatabase();
      await pingReadDatabase();
    });

    test("connectReadDatabase returns the same client when already connected", async () => {
      const client1 = await connectReadDatabase();
      const client2 = await connectReadDatabase();
      assert.strictEqual(client1, client2);
    });

    test("getReadClient returns the connected client", async () => {
      const connected = await connectReadDatabase();
      assert.strictEqual(getReadClient(), connected);
    });
  }
});
