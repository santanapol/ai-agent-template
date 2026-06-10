import { test } from "node:test";
import assert from "node:assert/strict";
import buildApp from "./app.js";

test("GET /healthz returns ok status", async () => {
  const app = await buildApp();

  const response = await app.inject({ method: "GET", url: "/healthz" });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, "ok");
  assert.equal(typeof body.timestamp, "string");

  await app.close();
});
