import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import buildApp from "./app.js";
import { connectDatabase, closeDatabase } from "./config/database.js";
import {
  connectReadDatabase,
  closeReadDatabase,
} from "./config/database-read.js";

test("GET /healthz returns ok status", async () => {
  const app = await buildApp();

  const response = await app.inject({ method: "GET", url: "/healthz" });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, "ok");
  assert.equal(typeof body.timestamp, "string");

  await app.close();
});

describe("GET /readyz", () => {
  afterEach(async () => {
    await closeDatabase();
    await closeReadDatabase();
  });

  test("returns 503 when databases are not connected", async () => {
    const app = await buildApp();

    const response = await app.inject({ method: "GET", url: "/readyz" });

    assert.equal(response.statusCode, 503);
    assert.equal(response.json().status, "error");

    await app.close();
  });

  if (
    process.env.MONGODB_URI &&
    process.env.DB_NAME &&
    process.env.MONGODB_URI_READ
  ) {
    test("returns ok when both databases are connected", async () => {
      await connectDatabase();
      await connectReadDatabase();
      const app = await buildApp();

      const response = await app.inject({ method: "GET", url: "/readyz" });

      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.equal(body.status, "ok");
      assert.deepEqual(body.dependencies.map((dep) => dep.name).sort(), [
        "database",
        "database-read",
      ]);

      await app.close();
    });
  }
});
