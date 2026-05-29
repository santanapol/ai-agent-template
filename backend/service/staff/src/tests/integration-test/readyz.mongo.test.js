import { test, describe, before, after } from "node:test";
import assert from "node:assert";

import { readEnv } from "../../config/env.js";

const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

if (!RUN) {
  describe("readyz with MongoDB (skipped — no MONGODB_URI)", () => {
    test("documented skip until MONGODB_URI is configured", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase } =
    await import("../../config/database.js");
  const { default: createApp } = await import("../../app.js");

  describe("readyz with MongoDB (T04)", () => {
    let app;

    before(async () => {
      await connectDatabase();
      app = await createApp(initialEnv);
    });

    after(async () => {
      try {
        if (app) await app.close();
      } finally {
        await closeDatabase();
      }
    });

    test("GET /readyz returns 200 when database is connected", async () => {
      const res = await app.inject({ method: "GET", url: "/readyz" });
      assert.strictEqual(res.statusCode, 200);
      const body = res.json();
      assert.strictEqual(body.status, "ok");
      assert.strictEqual(body.dependencies[0].name, "database");
      assert.strictEqual(body.dependencies[0].status, "ok");
    });
  });
}
