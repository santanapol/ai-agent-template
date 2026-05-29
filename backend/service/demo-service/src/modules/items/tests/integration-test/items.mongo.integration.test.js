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

      const delHeaders = {
        ...primaryHeaders(),
        "if-match": String(etagAfterPatch),
      };
      delete delHeaders["content-type"];
      const removed = await app.inject({
        method: "DELETE",
        url: `/api/v1/items/${itemId}`,
        headers: delHeaders,
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

    test("returns 428 PRECONDITION_REQUIRED when if-match is missing", async () => {
      const putRes = await app.inject({
        method: "PUT",
        url: "/api/v1/items/507f1f77bcf86cd799439011",
        headers: primaryHeaders(),
        payload: {
          code: "TEST",
          name: "TEST",
          description: null,
          status: "draft",
          tags: [],
        },
      });
      assert.strictEqual(putRes.statusCode, 428, putRes.payload);

      const patchRes = await app.inject({
        method: "PATCH",
        url: "/api/v1/items/507f1f77bcf86cd799439011",
        headers: primaryHeaders(),
        payload: { name: "TEST" },
      });
      assert.strictEqual(patchRes.statusCode, 428, patchRes.payload);

      const delHeaders = primaryHeaders();
      delete delHeaders["content-type"];
      const delRes = await app.inject({
        method: "DELETE",
        url: "/api/v1/items/507f1f77bcf86cd799439011",
        headers: delHeaders,
      });
      assert.strictEqual(delRes.statusCode, 428, delRes.payload);
    });

    test("returns 412 VERSION_CONFLICT for stale etag", async () => {
      // Create item
      const created = await app.inject({
        method: "POST",
        url: "/api/v1/items",
        headers: primaryHeaders(),
        payload: { code: "STALE_TEST", name: "STALE", status: "draft" },
      });
      const itemId = created.json().data.id;
      const initialEtag = created.headers.etag;

      // First update succeeds
      const put1 = await app.inject({
        method: "PUT",
        url: `/api/v1/items/${itemId}`,
        headers: { ...primaryHeaders(), "if-match": initialEtag },
        payload: {
          code: "STALE_TEST",
          name: "UPDATED",
          description: null,
          status: "draft",
          tags: [],
        },
      });
      assert.strictEqual(put1.statusCode, 200, put1.payload);

      // Second update with OLD etag fails
      const put2 = await app.inject({
        method: "PUT",
        url: `/api/v1/items/${itemId}`,
        headers: { ...primaryHeaders(), "if-match": initialEtag },
        payload: {
          code: "STALE_TEST",
          name: "UPDATED_AGAIN",
          description: null,
          status: "draft",
          tags: [],
        },
      });
      assert.strictEqual(put2.statusCode, 412, put2.payload);

      const patch2 = await app.inject({
        method: "PATCH",
        url: `/api/v1/items/${itemId}`,
        headers: { ...primaryHeaders(), "if-match": initialEtag },
        payload: { name: "UPDATED_AGAIN" },
      });
      assert.strictEqual(patch2.statusCode, 412);

      const delHeaders = { ...primaryHeaders(), "if-match": initialEtag };
      delete delHeaders["content-type"];
      const del2 = await app.inject({
        method: "DELETE",
        url: `/api/v1/items/${itemId}`,
        headers: delHeaders,
      });
      assert.strictEqual(del2.statusCode, 412);
    });

    test("returns 404 RESOURCE_NOT_FOUND for non-existent item with valid etag", async () => {
      const { encodeEtagFromDate } = await import("../../../../lib/etag.js");
      const validEtag = encodeEtagFromDate(new Date());
      const fakeId = new ObjectId().toString();

      const putRes = await app.inject({
        method: "PUT",
        url: `/api/v1/items/${fakeId}`,
        headers: { ...primaryHeaders(), "if-match": validEtag },
        payload: {
          code: "TEST",
          name: "TEST",
          description: null,
          status: "draft",
          tags: [],
        },
      });
      assert.strictEqual(putRes.statusCode, 404, putRes.payload);

      const patchRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/items/${fakeId}`,
        headers: { ...primaryHeaders(), "if-match": validEtag },
        payload: { name: "TEST" },
      });
      assert.strictEqual(patchRes.statusCode, 404);

      const delHeaders = { ...primaryHeaders(), "if-match": validEtag };
      delete delHeaders["content-type"];
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/items/${fakeId}`,
        headers: delHeaders,
      });
      assert.strictEqual(delRes.statusCode, 404);
    });
  });
}
