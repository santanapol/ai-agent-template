"use strict";

/**
 * Full-stack HTTP + MongoDB integration for `items`.
 * Requires MONGODB_URI (shell/CI) or `.env` at package root (via loadLocalEnv).
 * Skips the whole suite when no URI — keeps `npm test` green without a server.
 */

jest.resetModules();

const { loadLocalEnv } = require("../../../../config/load-local-env");
loadLocalEnv();

const { readEnv } = require("../../../../config/env");
const initialEnv = readEnv();
const RUN = Boolean(initialEnv.mongoUri && initialEnv.mongoUri.trim());

if (!RUN) {
  // Opt-in suite: no Mongo in env → skip without failing CI.
  // eslint-disable-next-line jest/no-disabled-tests -- requires MONGODB_URI / .env
  describe.skip("items HTTP with MongoDB (skipped — no MONGODB_URI)", () => {
    it("documented skip until MONGODB_URI is configured", () => {
      expect(RUN).toBe(false);
    });
  });
} else {
  const request = require("supertest");
  const { ObjectId } = require("mongodb");
  const {
    connectDatabase,
    closeDatabase,
    getDatabase,
  } = require("../../../../config/database");
  const createApp = require("../../../../app");

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
        Accept: "application/json",
        "Content-Type": "application/json",
      };
    }

    function primaryHeaders() {
      return tenantHeaders(testOu, testBranch);
    }

    beforeAll(async () => {
      await connectDatabase(initialEnv);
      app = createApp(initialEnv);
    });

    afterAll(async () => {
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
        /* best-effort cleanup (e.g. auth mismatch on local Mongo) */
      } finally {
        await closeDatabase();
      }
    });

    it("runs CRUD with optimistic concurrency (If-Match)", async () => {
      const code = `INT${Date.now()}`.replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
      expect(code.length).toBeGreaterThanOrEqual(3);
      const createBody = {
        code,
        name: "Mongo integration item",
        description: null,
        status: "draft",
        tags: ["alpha"],
      };

      const created = await request(app)
        .post("/api/v1/items")
        .set(primaryHeaders())
        .send(createBody)
        .expect(201);

      expect(created.body.success).toBe(true);
      expect(created.body.data.id).toMatch(/^[a-f0-9]{24}$/);
      const itemId = created.body.data.id;
      expect(created.headers.etag).toBeTruthy();

      const listed = await request(app)
        .get("/api/v1/items")
        .set(primaryHeaders())
        .expect(200);
      expect(listed.body.data.some((row) => row.id === itemId)).toBe(true);

      const detail = await request(app)
        .get(`/api/v1/items/${itemId}`)
        .set(primaryHeaders())
        .expect(200);
      expect(detail.body.data.id).toBe(itemId);
      const etagDetail = detail.headers.etag;
      expect(etagDetail).toBeTruthy();

      const replaced = await request(app)
        .put(`/api/v1/items/${itemId}`)
        .set(primaryHeaders())
        .set("If-Match", String(etagDetail))
        .send({
          code: createBody.code,
          name: "Replaced name",
          description: null,
          status: "active",
          tags: ["beta"],
        })
        .expect(200);
      expect(replaced.body.data.name).toBe("Replaced name");
      const etagAfterPut = replaced.headers.etag;
      expect(etagAfterPut).toBeTruthy();

      const patched = await request(app)
        .patch(`/api/v1/items/${itemId}`)
        .set(primaryHeaders())
        .set("If-Match", String(etagAfterPut))
        .send({ name: "Patched name" })
        .expect(200);
      expect(patched.body.data.name).toBe("Patched name");
      const etagAfterPatch = patched.headers.etag;
      expect(etagAfterPatch).toBeTruthy();

      const removed = await request(app)
        .delete(`/api/v1/items/${itemId}`)
        .set(primaryHeaders())
        .set("If-Match", String(etagAfterPatch))
        .expect(200);
      expect(removed.body.data.deleted).toBe(true);

      await request(app)
        .get(`/api/v1/items/${itemId}`)
        .set(primaryHeaders())
        .expect(404);
    });

    it("returns 404 for another tenant on the same item id", async () => {
      const code = `TNT${Date.now()}`.replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
      expect(code.length).toBeGreaterThanOrEqual(3);
      const body = {
        code,
        name: "Tenant isolation",
        description: null,
        status: "draft",
        tags: [],
      };

      const created = await request(app)
        .post("/api/v1/items")
        .set(primaryHeaders())
        .send(body)
        .expect(201);
      const itemId = created.body.data.id;

      const alien = await request(app)
        .get(`/api/v1/items/${itemId}`)
        .set(tenantHeaders(otherOu, otherBranch))
        .expect(404);
      expect(alien.body.success).toBe(false);
    });
  });
}
