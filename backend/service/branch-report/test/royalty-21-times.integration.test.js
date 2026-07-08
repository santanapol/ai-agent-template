import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { after, before, describe, it } from "node:test";

import { buildApp } from "../src/app.js";

const GATEWAY_SECRET = "test-gateway-secret";
const OU_ID = "507f1f77bcf86cd799439011";
const BRANCH_ID = "507f1f77bcf86cd799439012";
const INVITE_LINK_ID = "507f1f77bcf86cd799439013";
const REG_FROM = "2024-06-01";
const REG_TO = "2024-06-30";

function royaltyQuery(params) {
  const search = new URLSearchParams({
    regDateFrom: REG_FROM,
    regDateTo: REG_TO,
    ...params,
  });
  return `/api/v1/branch-report/royalty-21-times?${search.toString()}`;
}

function memberMatchesFilter(filter) {
  if (filter.referral !== "Member") {
    return false;
  }
  if (!filter.reg_date) {
    return true;
  }
  const regDate = new Date("2024-06-15T10:30:00Z");
  return regDate >= filter.reg_date.$gte && regDate <= filter.reg_date.$lte;
}

const validUserHeaders = {
  "x-gateway-secret": GATEWAY_SECRET,
  "x-user-ou": OU_ID,
  "x-user-branch": BRANCH_ID,
};

/** @type {import('fastify').FastifyInstance} */
let app;

before(async () => {
  const memId = new ObjectId();
  const regDate = new Date("2024-06-15T10:30:00Z");

  const getDb = () => ({
    collection(name) {
      if (name === "su_staff_invite_link") {
        return {
          async findOne(filter) {
            if (filter._id?.toString() === INVITE_LINK_ID) {
              return { _id: new ObjectId(INVITE_LINK_ID) };
            }
            return null;
          },
        };
      }

      if (name === "member") {
        return {
          find(filter) {
            return {
              sort() {
                return {
                  skip() {
                    return {
                      limit() {
                        return {
                          project() {
                            return {
                              async toArray() {
                                if (memberMatchesFilter(filter)) {
                                  return [
                                    {
                                      _id: memId,
                                      username: "7W0635268288",
                                      reg_date: regDate,
                                    },
                                  ];
                                }
                                return [];
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          async countDocuments(filter) {
            return memberMatchesFilter(filter) ? 1 : 0;
          },
        };
      }

      if (name === "dm_dm_tn_deposit") {
        return {
          aggregate(pipeline) {
            const isBillin = pipeline.some(
              (stage) => stage.$group && stage.$group.billin,
            );

            return {
              async toArray() {
                if (isBillin) {
                  return [{ _id: memId, billin: 15000 }];
                }
                return [{ _id: memId, deposits: [100, 200, 500] }];
              },
            };
          },
        };
      }

      if (name === "wallet_withdraw") {
        return {
          aggregate() {
            return {
              async toArray() {
                return [{ _id: memId, withdraw: 5000 }];
              },
            };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  });

  app = await buildApp({
    logger: false,
    gatewaySecret: GATEWAY_SECRET,
    getDb,
  });
});

after(async () => {
  await app.close();
});

describe("GET /api/v1/branch-report/royalty-21-times (T6c)", () => {
  it("returns paginated report rows in standard envelope", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        page: "1",
        pageSize: "50",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.code, "SUCCESS");
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].username, "7W0635268288");
    assert.equal(body.data[0].register, "15/06/2024");
    assert.equal(body.data[0].billin, 15000);
    assert.equal(body.data[0].withdraw, 5000);
    assert.equal(body.data[0].promotion, 0);
    assert.equal(body.data[0].revenue, 10000);
    assert.deepEqual(body.data[0].deposits.slice(0, 3), [100, 200, 500]);
    assert.equal(body.data[0].deposits.length, 21);
    assert.deepEqual(body.pagination, { page: 1, pageSize: 50, total: 1 });
  });

  it("clamps pageSize above 100", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({ channelType: "member_referral", pageSize: "200" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().pagination.pageSize, 100);
  });

  it("returns INVALID_PARAM when affiliate_link is missing inviteLinkId", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({ channelType: "affiliate_link" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    const body = response.json();
    assert.equal(body.code, "INVALID_PARAM");
    assert.equal(body.data, null);
  });

  it("returns INVALID_PARAM for invalid inviteLinkId", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "affiliate_link",
        inviteLinkId: "not-valid",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM for invalid channelType enum", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({ channelType: "unknown" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM when inviteLinkId is not in tenant", async () => {
    const otherInviteLinkId = "507f1f77bcf86cd799439099";
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "affiliate_link",
        inviteLinkId: otherInviteLinkId,
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /inviteLinkId/i);
  });

  it("accepts affiliate_link with valid inviteLinkId", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "affiliate_link",
        inviteLinkId: INVITE_LINK_ID,
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().pagination.total, 0);
    assert.deepEqual(response.json().data, []);
  });

  it("returns INVALID_PARAM when reg dates are missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/royalty-21-times?channelType=member_referral",
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM when regDateFrom is after regDateTo", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        regDateFrom: "2024-06-30",
        regDateTo: "2024-06-01",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.match(response.json().message, /regDateFrom/i);
  });

  it("returns INVALID_PARAM when reg date range exceeds max days", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        regDateFrom: "2024-01-01",
        regDateTo: "2025-01-01",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /366/);
  });

  it("returns empty data when reg range excludes members", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        regDateFrom: "2020-01-01",
        regDateTo: "2020-01-31",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data, []);
    assert.equal(response.json().pagination.total, 0);
  });
});
