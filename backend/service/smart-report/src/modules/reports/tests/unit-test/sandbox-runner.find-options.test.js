import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeFindSecondArg } from "../../sandbox-runner.service.js";

describe("normalizeFindSecondArg", () => {
  test("wraps shell-style projection document", () => {
    assert.deepEqual(normalizeFindSecondArg({ _id: 0, code: 1 }), {
      projection: { _id: 0, code: 1 },
    });
  });

  test("passes through driver-style projection option", () => {
    const input = { projection: { _id: 0 } };
    assert.deepEqual(normalizeFindSecondArg(input), input);
  });

  test("passes through driver-style sort and limit options", () => {
    const input = { sort: { _id: -1 }, limit: 10 };
    assert.deepEqual(normalizeFindSecondArg(input), input);
  });

  test("returns empty object unchanged", () => {
    assert.deepEqual(normalizeFindSecondArg({}), {});
  });

  test("maps undefined to empty object", () => {
    assert.deepEqual(normalizeFindSecondArg(undefined), {});
  });

  test("maps null to empty object", () => {
    assert.deepEqual(normalizeFindSecondArg(null), {});
  });
});
