import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildPagination } from "../../reports.service.js";

describe("reports.service (pure helpers)", () => {
  describe("buildPagination", () => {
    test("total === 0 -> totalPages is at least 1", () => {
      assert.deepEqual(buildPagination({ page: 1, limit: 20 }, 0), {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      });
    });

    test("total < limit -> totalPages is 1", () => {
      assert.deepEqual(buildPagination({ page: 1, limit: 20 }, 5), {
        page: 1,
        limit: 20,
        total: 5,
        totalPages: 1,
      });
    });

    test("total exactly divisible by limit", () => {
      assert.deepEqual(buildPagination({ page: 1, limit: 10 }, 30), {
        page: 1,
        limit: 10,
        total: 30,
        totalPages: 3,
      });
    });

    test("total not exactly divisible by limit rounds totalPages up", () => {
      assert.deepEqual(buildPagination({ page: 1, limit: 10 }, 31), {
        page: 1,
        limit: 10,
        total: 31,
        totalPages: 4,
      });
    });

    test("page beyond totalPages is passed through unchanged", () => {
      assert.deepEqual(buildPagination({ page: 99, limit: 20 }, 5), {
        page: 99,
        limit: 20,
        total: 5,
        totalPages: 1,
      });
    });
  });
});
