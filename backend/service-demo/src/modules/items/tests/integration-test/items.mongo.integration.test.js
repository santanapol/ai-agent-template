import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { ObjectId } from "mongodb";

import { readEnv } from "../../../../config/env.js";
const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

if (!RUN) {
  describe("items HTTP with MongoDB (skipped — no MONGODB_URI)", () => {
    test("documented skip until MONGODB_URI is configured", () => {
      assert.strictEqual(RUN, false);
    });
  });
} else {
  const { connectDatabase, closeDatabase, getDatabase } =
    await import("../../../../config/database.js");
  const { default: createApp } = await import("../../../../app.js");

  describe("items HTTP with MongoDB", () => {
    const testOu = new ObjectId().toString();
    const testBranch = new ObjectId().toString();
    const otherOu = new ObjectId().toString();
    const otherBranch = new ObjectId().toString();

    let app;

    function tenantHeaders(ou, branch) {
      return {
        "x-gateway-secret": initialEnv.gatewaySharedSecret,
        "x-user-id": "mongo-int-user",
        "x-user-ou": ou,
        "x-user-branch": branch,
        accept: "application/json",
        "content-type": "application/json",
      };
    }

    function primaryHeaders() {
      return tenantHeaders(testOu, testBranch);
    }

    before(async () => {
      await connectDatabase();
      app = await createApp(initialEnv);
    });

    after(async () => {
      try {
        const col = getDatabase().collection("items");
        await col.deleteMany({
          ou_id: new ObjectId(testOu),
          branch_id: new ObjectId(testBranch),
        });
        await col.deleteMany({
          ou_id: new ObjectId(otherOu),
          branch_id: new ObjectId(otherBranch),
        });
      } catch (_err) {
        // ignore error
      } finally {
        if (app) await app.close();
        await closeDatabase();
      }
    });

    test("runs CRUD with optimistic concurrency (If-Match)", async () => {
      const code = `INT${Date.now()}`.replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
      assert.ok(code.length >= 3);
      const createBody = {
        code,
        name: "Mongo integration item",
        description: null,
        status: "draft",
        tags: ["alpha"],
      };

      const created = await app.inject({
        method: "POST",
        url: "/api/v1/items",
        headers: primaryHeaders(),
        payload: createBody,
      });
      assert.strictEqual(created.statusCode, 201);
      const createdBody = created.json();
      assert.strictEqual(createdBody.success, true);
      assert.match(createdBody.data.id, /^[a-f0-9]{24}$/);

      const itemId = createdBody.data.id;
      assert.ok(created.headers.etag);

      const listed = await app.inject({
        method: "GET",
        url: "/api/v1/items",
        headers: primaryHeaders(),
      });
      assert.strictEqual(listed.statusCode, 200);
      const listedBody = listed.json();
      assert.ok(listedBody.data.some((row) => row.id === itemId));

      const detail = await app.inject({
        method: "GET",
        url: `/api/v1/items/${itemId}`,
        headers: primaryHeaders(),
      });
      assert.strictEqual(detail.statusCode, 200);
      const detailBody = detail.json();
      assert.strictEqual(detailBody.data.id, itemId);

      const etagDetail = detail.headers.etag;
      assert.ok(etagDetail);

      const replaced = await app.inject({
        method: "PUT",
        url: `/api/v1/items/${itemId}`,
        headers: { ...primaryHeaders(), "if-match": String(etagDetail) },
        payload: {
          code: createBody.code,
          name: "Replaced name",
          description: null,
          status: "active",
          tags: ["beta"],
        },
      });
      assert.strictEqual(replaced.statusCode, 200);
      const replacedBody = replaced.json();
      assert.strictEqual(replacedBody.data.name, "Replaced name");

      const etagAfterPut = replaced.headers.etag;
      assert.ok(etagAfterPut);

      const patched = await app.inject({
        method: "PATCH",
        url: `/api/v1/items/${itemId}`,
        headers: { ...primaryHeaders(), "if-match": String(etagAfterPut) },
        payload: { name: "Patched name" },
      });
      assert.strictEqual(patched.statusCode, 200);
      const patchedBody = patched.json();
      assert.strictEqual(patchedBody.data.name, "Patched name");

      const etagAfterPatch = patched.headers.etag;
      assert.ok(etagAfterPatch);

      const removed = await app.inject({
        method: "DELETE",
        url: `/api/v1/items/${itemId}`,
        headers: { ...primaryHeaders(), "if-match": String(etagAfterPatch) },
      });
      assert.strictEqual(removed.statusCode, 200);
      const removedBody = removed.json();
      assert.strictEqual(removedBody.data.deleted, true);

      const checkAlien = await app.inject({
        method: "GET",
        url: `/api/v1/items/${itemId}`,
        headers: primaryHeaders(),
      });
      assert.strictEqual(checkAlien.statusCode, 404);
    });

    test("returns 404 for another tenant on the same item id", async () => {
      const code = `TNT${Date.now()}`.replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
      const body = {
        code,
        name: "Tenant isolation",
        description: null,
        status: "draft",
        tags: [],
      };

      const created = await app.inject({
        method: "POST",
        url: "/api/v1/items",
        headers: primaryHeaders(),
        payload: body,
      });
      assert.strictEqual(created.statusCode, 201);
      const itemId = created.json().data.id;

      const alien = await app.inject({
        method: "GET",
        url: `/api/v1/items/${itemId}`,
        headers: tenantHeaders(otherOu, otherBranch),
      });
      assert.strictEqual(alien.statusCode, 404);
      assert.strictEqual(alien.json().success, false);
    });
  });
}
