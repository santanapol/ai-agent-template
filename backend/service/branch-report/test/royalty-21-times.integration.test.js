import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { after, before, describe, it } from "node:test";

import { buildApp } from "../src/app.js";

const GATEWAY_SECRET = "test-gateway-secret";
const OU_ID = "507f1f77bcf86cd799439011";
const BRANCH_ID = "507f1f77bcf86cd799439012";
const INVITE_LINK_ID = "507f1f77bcf86cd799439013";
const INVITE_LINK_ID_WITH_MEMBERS = "507f1f77bcf86cd799439016";
const REFERRAL_UID = "507f1f77bcf86cd799439014";
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

/**
 * Minimal evaluator for the `$switch`/`$and`/`$gte`/`$lte` expressions built
 * by `buildBucketSwitch` (royalty-21-times.repository.js), so the fake "member"
 * collection's `aggregate()` executes the real pipeline shape instead of
 * hardcoding bucket boundaries a second time in the test double.
 */
function resolveFieldPath(expr, doc) {
  return expr
    .replace(/^\$/, "")
    .split(".")
    .reduce((value, key) => value?.[key], doc);
}

function evalCondition(cond, doc) {
  if (cond.$and) {
    return cond.$and.every((sub) => evalCondition(sub, doc));
  }
  const [op, args] = Object.entries(cond)[0];
  const [fieldExpr, value] = args;
  const resolved = resolveFieldPath(fieldExpr, doc);
  if (op === "$gte") return resolved >= value;
  if (op === "$lte") return resolved <= value;
  throw new Error(`Unsupported condition operator: ${op}`);
}

function evalSwitch(switchExpr, doc) {
  const { branches, default: fallback } = switchExpr.$switch;
  for (const branch of branches) {
    if (evalCondition(branch.case, doc)) {
      return branch.then;
    }
  }
  return fallback;
}

function memberMatchesFilter(filter) {
  const matchesChannel =
    filter.referral === "Member" ||
    filter.referral_staff_link_id?.toString() === INVITE_LINK_ID_WITH_MEMBERS;
  if (!matchesChannel) {
    return false;
  }
  if (filter.referral_uid && filter.referral_uid.toString() !== REFERRAL_UID) {
    return false;
  }
  if (!filter.reg_date) {
    return true;
  }
  const regDate = new Date("2024-06-15T10:30:00Z");
  return regDate >= filter.reg_date.$gte && regDate <= filter.reg_date.$lte;
}

const CHANNEL_PERFORMANCE_READ_PERMISSION =
  "branch-report:marketing:channel-performance:read";

const validUserHeaders = {
  "x-gateway-secret": GATEWAY_SECRET,
  "x-user-ou": OU_ID,
  "x-user-branch": BRANCH_ID,
  "x-user-permissions": CHANNEL_PERFORMANCE_READ_PERMISSION,
};

const noPermissionUserHeaders = {
  "x-gateway-secret": GATEWAY_SECRET,
  "x-user-ou": OU_ID,
  "x-user-branch": BRANCH_ID,
  "x-user-permissions": "branch-report:other:read",
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
            const id = filter._id?.toString();
            if (id === INVITE_LINK_ID || id === INVITE_LINK_ID_WITH_MEMBERS) {
              return { _id: new ObjectId(id) };
            }
            return null;
          },
        };
      }

      if (name === "member") {
        return {
          find(filter) {
            async function toArray() {
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
            }

            const projectResult = {
              project() {
                return { toArray };
              },
            };

            return {
              ...projectResult,
              sort() {
                return {
                  skip() {
                    return {
                      limit() {
                        return projectResult;
                      },
                    };
                  },
                };
              },
            };
          },
          async findOne(filter) {
            if (filter.username === "REFERRER01") {
              return {
                _id: new ObjectId(REFERRAL_UID),
                username: "REFERRER01",
              };
            }
            if (
              filter.referral === "Member" &&
              filter.referral_uid?.toString() === REFERRAL_UID
            ) {
              return { _id: memId };
            }
            return null;
          },
          async countDocuments(filter) {
            return memberMatchesFilter(filter) ? 1 : 0;
          },
          aggregate(pipeline) {
            return {
              async toArray() {
                const matchStage = pipeline[0].$match;
                const candidates = memberMatchesFilter(matchStage)
                  ? [{ _id: memId }]
                  : [];

                const lookupStage = pipeline.find((stage) => stage.$lookup);
                const limit = lookupStage.$lookup.pipeline.find(
                  (stage) => stage.$limit,
                ).$limit;
                const switchExpr = pipeline.find((stage) => stage.$addFields)
                  .$addFields.bucketIndex;

                const groupCounts = new Map();
                for (let i = 0; i < candidates.length; i += 1) {
                  // This fake member's only deposits, already bill_date ASC.
                  const deposits = [100, 200, 500].slice(0, limit);
                  deposits.forEach((amt, round) => {
                    const bucketIndex = evalSwitch(switchExpr, {
                      deposits: { amt },
                    });
                    if (bucketIndex === null) return;
                    const key = `${bucketIndex}:${round}`;
                    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
                  });
                }

                return Array.from(groupCounts, ([key, count]) => {
                  const [bucketIndex, round] = key.split(":").map(Number);
                  return { _id: { bucketIndex, round }, count };
                });
              },
            };
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

      if (name === "promotion_receive") {
        return {
          aggregate() {
            return {
              async toArray() {
                return [{ _id: memId, promotion: 1200 }];
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
        referralUsername: "REFERRER01",
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
    assert.equal(body.data[0].promotion, 1200);
    assert.equal(body.data[0].revenue, 10000);
    assert.deepEqual(body.data[0].deposits.slice(0, 3), [100, 200, 500]);
    assert.equal(body.data[0].deposits.length, 21);
    assert.deepEqual(body.pagination, { page: 1, pageSize: 50, total: 1 });
  });

  it("clamps pageSize above 100", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        pageSize: "200",
      }),
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

  it("returns INVALID_PARAM when member_referral is missing referralUsername", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({ channelType: "member_referral" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /referralUsername/i);
  });

  it("returns INVALID_PARAM when referring member username has no exact match", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        referralUsername: "NO_SUCH_USER",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /not found/i);
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
        referralUsername: "REFERRER01",
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
        referralUsername: "REFERRER01",
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
        referralUsername: "REFERRER01",
        regDateFrom: "2020-01-01",
        regDateTo: "2020-01-31",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().data, []);
    assert.equal(response.json().pagination.total, 0);
  });

  it("silently strips an unknown query parameter instead of forwarding it to the filter", async () => {
    // Fastify's default Ajv config (removeAdditional: true) drops properties
    // barred by `additionalProperties: false` rather than rejecting the
    // request - this proves the param never reaches the Mongo filter.
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        unexpectedParam: "1",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.length, 1);
  });

  it("returns PERMISSION_DENIED without channel-performance:read permission", async () => {
    const response = await app.inject({
      method: "GET",
      url: royaltyQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
      }),
      headers: noPermissionUserHeaders,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "PERMISSION_DENIED");
  });
});

function depositMatrixQuery(params) {
  const search = new URLSearchParams({
    regDateFrom: REG_FROM,
    regDateTo: REG_TO,
    ...params,
  });
  return `/api/v1/branch-report/royalty-21-times/deposit-matrix?${search.toString()}`;
}

describe("GET /api/v1/branch-report/royalty-21-times/deposit-matrix", () => {
  it("returns deposit matrix envelope without pagination", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.success, true);
    assert.equal(body.code, "SUCCESS");
    assert.equal(body.pagination, undefined);
    assert.equal(body.data.rounds, 21);
    assert.equal(body.data.counts.length, 9);
    assert.equal(body.data.counts[0].length, 21);
    assert.equal(body.data.counts[1][0], 1);
    assert.equal(body.data.counts[2][1], 1);
    assert.equal(body.data.counts[4][2], 1);
    assert.equal(body.data.rowSums[1], 1);
    assert.equal(body.data.rowSums[2], 1);
    assert.equal(body.data.rowSums[4], 1);

    const topBucket = body.data.buckets[8];
    assert.equal(topBucket.key, "10000+");
    assert.equal(topBucket.max, null);
  });

  it("returns INVALID_PARAM when channelType is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/branch-report/royalty-21-times/deposit-matrix?regDateFrom=${REG_FROM}&regDateTo=${REG_TO}`,
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM when affiliate_link is missing inviteLinkId", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({ channelType: "affiliate_link" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM for invalid inviteLinkId", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
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
      url: depositMatrixQuery({ channelType: "unknown" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM when inviteLinkId is not in tenant", async () => {
    const otherInviteLinkId = "507f1f77bcf86cd799439099";
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "affiliate_link",
        inviteLinkId: otherInviteLinkId,
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /inviteLinkId/i);
  });

  it("returns INVALID_PARAM when reg dates are missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/branch-report/royalty-21-times/deposit-matrix?channelType=member_referral",
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
  });

  it("returns INVALID_PARAM when regDateFrom is after regDateTo", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
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
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2024-01-01",
        regDateTo: "2025-01-01",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /366/);
  });

  it("returns a non-empty matrix for a matched affiliate_link cohort", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "affiliate_link",
        inviteLinkId: INVITE_LINK_ID_WITH_MEMBERS,
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.data.counts[1][0], 1);
    assert.equal(body.data.counts[2][1], 1);
    assert.equal(body.data.counts[4][2], 1);
    assert.equal(body.data.rowSums[1], 1);
    assert.equal(body.data.rowSums[2], 1);
    assert.equal(body.data.rowSums[4], 1);
  });

  it("returns a zero matrix when no members match the channel filter", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "affiliate_link",
        inviteLinkId: INVITE_LINK_ID,
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.data.rounds, 21);
    assert.equal(
      body.data.counts.flat().every((n) => n === 0),
      true,
    );
    assert.equal(
      body.data.rowSums.every((n) => n === 0),
      true,
    );
    assert.equal(
      body.data.percents.flat().every((n) => n === 0),
      true,
    );
  });

  it("returns a zero matrix when reg range excludes members", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        regDateFrom: "2020-01-01",
        regDateTo: "2020-01-31",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(
      response
        .json()
        .data.counts.flat()
        .every((n) => n === 0),
      true,
    );
  });

  it("returns INVALID_PARAM when member_referral is missing referralUsername", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({ channelType: "member_referral" }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /referralUsername/i);
  });

  it("returns INVALID_PARAM when referring member username has no exact match", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "NO_SUCH_USER",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "INVALID_PARAM");
    assert.match(response.json().message, /not found/i);
  });

  it("silently strips an unknown query parameter instead of forwarding it to the filter", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
        unexpectedParam: "1",
      }),
      headers: validUserHeaders,
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.rowSums[1], 1);
  });

  it("returns PERMISSION_DENIED without channel-performance:read permission", async () => {
    const response = await app.inject({
      method: "GET",
      url: depositMatrixQuery({
        channelType: "member_referral",
        referralUsername: "REFERRER01",
      }),
      headers: noPermissionUserHeaders,
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().code, "PERMISSION_DENIED");
  });
});
