import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { after, before, describe, it } from "node:test";

import { buildApp } from "../src/app.js";

const GATEWAY_SECRET = "test-gateway-secret";

const OU_ID = "507f1f77bcf86cd799439011";
const BRANCH_ID = "507f1f77bcf86cd799439012";

const validUserHeaders = {
  "x-gateway-secret": GATEWAY_SECRET,
  "x-user-ou": OU_ID,
  "x-user-branch": BRANCH_ID,
};

/** @type {import('fastify').FastifyInstance} */
let app;

before(async () => {
  const linkId1 = new ObjectId();
  const linkId2 = new ObjectId();

  const mockDocs = [
    {
      _id: linkId2,
      invite_code: "3000002",
      username: "ZULU",
      description: "zulu-link",
    },
    {
      _id: linkId1,
      invite_code: "3000001",
      username: "BERLIN",
      description: "line777ww7",
    },
  ];

  let capturedFilter;

  const getDb = () => ({
    collection(name) {
      assert.equal(name, "su_staff_invite_link");
      return {
        find(filter) {
          capturedFilter = filter;
          return {
            sort() {
              return {
                async toArray() {
                  return mockDocs;
                },
              };
            },
          };
        },
      };
    },
  });

  app = await buildApp({
    logger: false,
    gatewaySecret: GATEWAY_SECRET,
    getDb,
  });

  app._testCapturedFilter = () => capturedFilter;
});

after(async () => {
  await app.close();
});

describe("GET /api/v1/branch-report/invite-links (T4)", () => {
  it("returns standard envelope with invite link array", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/invite-links",
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.code, "SUCCESS");
    assert.equal(body.message, null);
    assert.ok(Array.isArray(body.data));
    assert.equal(body.data.length, 2);
    assert.equal(body.data[0].inviteCode, "3000002");
    assert.equal(body.data[1].inviteCode, "3000001");
    assert.equal(body.pagination, undefined);
    assert.ok(body.requestId);
  });

  it("scopes query by ou_id and branch_id from user context", async () => {
    await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/invite-links",
      headers: validUserHeaders,
    });

    const filter = app._testCapturedFilter();
    assert.deepEqual(filter, {
      ou_id: new ObjectId(OU_ID),
      branch_id: new ObjectId(BRANCH_ID),
    });
  });
});
