import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";

import {
  buildPagination,
  normalizeScriptForCompare,
  serializeSampleRows,
  toTestRunHttpError,
} from "../../reports.service.js";
import {
  SandboxRunnerError,
  SANDBOX_ERROR_CODES,
} from "../../sandbox-runner.service.js";
import { HttpError } from "../../../../lib/http-error.js";
import CODES from "../../../../lib/error-codes.js";

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

  describe("normalizeScriptForCompare", () => {
    test("normalizes CRLF to LF before compare", () => {
      assert.equal(
        normalizeScriptForCompare("a\r\nb"),
        normalizeScriptForCompare("a\nb"),
      );
    });
  });

  describe("serializeSampleRows", () => {
    test("serializes ObjectId and Date to JSON-safe values", () => {
      const createdAt = new Date("2026-06-30T00:00:00.000Z");
      const rows = serializeSampleRows([
        { _id: new ObjectId("507f1f77bcf86cd799439011"), createdAt },
      ]);
      assert.equal(rows[0]._id, "507f1f77bcf86cd799439011");
      assert.equal(rows[0].createdAt, "2026-06-30T00:00:00.000Z");
    });

    test("respects sample limit", () => {
      const rows = serializeSampleRows([{ n: 1 }, { n: 2 }, { n: 3 }], 2);
      assert.equal(rows.length, 2);
    });
  });

  describe("toTestRunHttpError", () => {
    test("maps sandbox timeout to TEST_RUN_TIMEOUT", () => {
      const error = toTestRunHttpError(
        new SandboxRunnerError(
          SANDBOX_ERROR_CODES.TIMEOUT,
          "Script execution timed out after 50ms",
        ),
      );
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 422);
      assert.equal(error.code, CODES.TEST_RUN_TIMEOUT);
    });

    test("maps sandbox execution failure to VALIDATION_FAILED", () => {
      const error = toTestRunHttpError(
        new SandboxRunnerError(
          SANDBOX_ERROR_CODES.EXECUTION_FAILED,
          "Script execution failed: boom",
        ),
      );
      assert.equal(error.code, CODES.VALIDATION_FAILED);
      assert.equal(error.message, "Script execution failed: boom");
    });

    test("passes through non-sandbox errors", () => {
      const original = new Error("db down");
      assert.equal(toTestRunHttpError(original), original);
    });
  });
});
