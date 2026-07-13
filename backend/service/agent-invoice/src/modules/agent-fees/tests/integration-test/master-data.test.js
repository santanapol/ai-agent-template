import test from "node:test";
import assert from "node:assert";
import buildApp from "../../../../app.js";
import { buildMeshHeaders } from "../../../../lib/test-helpers/mesh-headers.js";

test("Master Data API - Game Companies and Categories", async (t) => {
  const app = await buildApp();
  const validHeaders = buildMeshHeaders({
    userId: "test_master_data_user",
    role: "platform_admin",
    permissions: "agents:fees",
  });

  t.after(async () => {
    await app.close();
  });

  await t.test(
    "GET /game-companies should return list of game companies",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-companies",
        headers: validHeaders,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.code, "SUCCESS");
      assert.ok(Array.isArray(body.data));
    },
  );

  await t.test(
    "GET /game-companies fields=matrix returns slim projection",
    async () => {
      const fullResponse = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-companies",
        headers: validHeaders,
      });
      const matrixResponse = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-companies?fields=matrix",
        headers: validHeaders,
      });

      assert.strictEqual(fullResponse.statusCode, 200);
      assert.strictEqual(matrixResponse.statusCode, 200);
      const fullBody = JSON.parse(fullResponse.payload);
      const matrixBody = JSON.parse(matrixResponse.payload);
      assert.ok(Array.isArray(fullBody.data));
      assert.ok(Array.isArray(matrixBody.data));
      assert.strictEqual(fullBody.data.length, matrixBody.data.length);

      if (matrixBody.data.length > 0) {
        const row = matrixBody.data[0];
        assert.deepStrictEqual(Object.keys(row).sort(), [
          "_id",
          "provider_name",
        ]);
        assert.ok(row._id);
        assert.ok("en" in row.provider_name);
        assert.ok(
          JSON.stringify(matrixBody.data).length <
            JSON.stringify(fullBody.data).length * 0.5,
        );
      }
    },
  );

  await t.test(
    "GET /game-companies fields=invalid returns 400 INVALID_PARAM",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-companies?fields=invalid",
        headers: validHeaders,
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.payload);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, "INVALID_PARAM");
    },
  );

  await t.test(
    "GET /game-categories should return list of game categories",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-categories",
        headers: validHeaders,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.payload);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.code, "SUCCESS");
      assert.ok(Array.isArray(body.data));
    },
  );

  await t.test(
    "GET /game-companies — 400 INVALID_PARAM when ou_id is not a valid ObjectId",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-companies?ou_id=not-a-valid-objectid",
        headers: validHeaders,
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.payload);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, "INVALID_PARAM");
    },
  );

  await t.test(
    "GET /game-categories — 400 INVALID_PARAM when ou_id is not a valid ObjectId",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/agent-invoice/master-data/game-categories?ou_id=not-a-valid-objectid",
        headers: validHeaders,
      });

      assert.strictEqual(response.statusCode, 400);
      const body = JSON.parse(response.payload);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, "INVALID_PARAM");
    },
  );
});
