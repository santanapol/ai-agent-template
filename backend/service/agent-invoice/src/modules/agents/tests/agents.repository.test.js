import { describe, test } from "node:test";
import assert from "node:assert";
import { listAgents, countAgents, activeOnlyAgentsMatch } from "../agents.repository.js";

const VALID_OU_ID = "000000000000000000000001";

const makeMockDb = (onAggregate, onCount) => ({
  collection: () => ({
    aggregate: (pipeline) => {
      if (onAggregate) onAggregate(pipeline);
      return { toArray: async () => [] };
    },
    countDocuments: async (query) => {
      if (onCount) onCount(query);
      return 0;
    },
  }),
});

describe("listAgents — regex escaping", () => {
  test("passes unmodified search string to $regex when search has no metacharacters", async () => {
    let captured;
    const db = makeMockDb((pipeline) => {
      captured = pipeline;
    });

    await listAgents(db, VALID_OU_ID, "branch01", 0, 10);

    const matchStage = captured.find((s) => s.$match);
    const regexVal = matchStage.$match.$or[0].branch_code.$regex;
    assert.strictEqual(regexVal, "branch01");
  });

  test("escapes regex metacharacters in search to prevent ReDoS", async () => {
    let captured;
    const db = makeMockDb((pipeline) => {
      captured = pipeline;
    });

    await listAgents(db, VALID_OU_ID, "(a+)+$", 0, 10);

    const matchStage = captured.find((s) => s.$match);
    const regexVal = matchStage.$match.$or[0].branch_code.$regex;

    assert.strictEqual(
      regexVal,
      "\\(a\\+\\)\\+\\$",
      `regex should be fully escaped, got: ${regexVal}`,
    );
  });

  test("escapes dot and asterisk in search", async () => {
    let captured;
    const db = makeMockDb((pipeline) => {
      captured = pipeline;
    });

    await listAgents(db, VALID_OU_ID, "a.*b", 0, 10);

    const matchStage = captured.find((s) => s.$match);
    const regexVal = matchStage.$match.$or[0].branch_code.$regex;
    assert.strictEqual(regexVal, "a\\.\\*b");
  });

  test("does not add $or clause when search is empty string", async () => {
    let captured;
    const db = makeMockDb((pipeline) => {
      captured = pipeline;
    });

    await listAgents(db, VALID_OU_ID, "", 0, 10);

    const matchStage = captured.find((s) => s.$match);
    assert.ok(
      !matchStage.$match.$or,
      "should not have $or when search is empty",
    );
  });

  test("countAgents — escapes regex metacharacters in search", async () => {
    let captured;
    const db = makeMockDb(null, (query) => {
      captured = query;
    });

    await countAgents(db, VALID_OU_ID, "(a+)+");

    assert.ok(captured.$or, "should have $or");
    const regexVal = captured.$or[0].branch_code.$regex;
    assert.strictEqual(
      regexVal,
      "\\(a\\+\\)\\+",
      `countAgents regex should be escaped, got: ${regexVal}`,
    );
  });
});

describe("listAgents — includeInactive", () => {
  test("applies active-only match by default", async () => {
    let captured;
    const db = makeMockDb((pipeline) => {
      captured = pipeline;
    });

    await listAgents(db, VALID_OU_ID, "", 0, 10);

    const matchStage = captured.find((s) => s.$match);
    assert.deepStrictEqual(matchStage.$match.active, { $nin: [false, 0, "0"] });
  });

  test("omits active filter when includeInactive is true", async () => {
    let captured;
    const db = makeMockDb((pipeline) => {
      captured = pipeline;
    });

    await listAgents(db, VALID_OU_ID, "", 0, 10, true);

    const matchStage = captured.find((s) => s.$match);
    assert.ok(!("active" in matchStage.$match));
  });

  test("countAgents mirrors includeInactive flag", async () => {
    let activeOnlyQuery;
    let allQuery;
    const db = makeMockDb(null, (query) => {
      if (query.active) activeOnlyQuery = query;
      else allQuery = query;
    });

    await countAgents(db, VALID_OU_ID, "");
    await countAgents(db, VALID_OU_ID, "", true);

    assert.deepStrictEqual(activeOnlyQuery.active, { $nin: [false, 0, "0"] });
    assert.ok(allQuery);
    assert.ok(!("active" in allQuery));
  });
});

describe("activeOnlyAgentsMatch", () => {
  test("returns empty object when includeInactive is true", () => {
    assert.deepStrictEqual(activeOnlyAgentsMatch(true), {});
  });

  test("returns $nin filter when includeInactive is false", () => {
    assert.deepStrictEqual(activeOnlyAgentsMatch(false), {
      active: { $nin: [false, 0, "0"] },
    });
  });
});
