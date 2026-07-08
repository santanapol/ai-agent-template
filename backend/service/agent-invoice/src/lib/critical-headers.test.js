import { test, describe } from "node:test";
import assert from "node:assert";
import {
  CRITICAL_HEADERS,
  countHeaderOccurrences,
  findDuplicateCriticalHeader,
} from "./critical-headers.js";

describe("critical-headers", () => {
  test("CRITICAL_HEADERS includes x-user-home-branch", () => {
    assert.ok(CRITICAL_HEADERS.includes("x-user-home-branch"));
  });

  test("countHeaderOccurrences detects duplicate wire headers", () => {
    const counts = countHeaderOccurrences([
      "x-user-ou",
      "5f4f9d57266ed249e45ecef5",
      "x-user-home-branch",
      "5f4fb5bb3156af7a2db9e5a0",
      "x-user-home-branch",
      "6a3000010000000000000001",
    ]);
    assert.strictEqual(counts.get("x-user-home-branch"), 2);
    assert.strictEqual(counts.get("x-user-ou"), 1);
  });

  test("findDuplicateCriticalHeader flags duplicate home-branch via rawHeaders", () => {
    const request = {
      headers: {
        "x-user-home-branch": "5f4fb5bb3156af7a2db9e5a0",
      },
      raw: {
        rawHeaders: [
          "x-user-home-branch",
          "5f4fb5bb3156af7a2db9e5a0",
          "x-user-home-branch",
          "6a3000010000000000000001",
        ],
      },
    };
    assert.strictEqual(
      findDuplicateCriticalHeader(request),
      "x-user-home-branch",
    );
  });

  test("findDuplicateCriticalHeader flags Fastify-coalesced array values", () => {
    const request = {
      headers: {
        "x-user-role": ["branch_admin", "platform_admin"],
      },
      raw: { rawHeaders: [] },
    };
    assert.strictEqual(findDuplicateCriticalHeader(request), "x-user-role");
  });

  test("findDuplicateCriticalHeader returns null when clean", () => {
    const request = {
      headers: {
        "x-user-home-branch": "5f4fb5bb3156af7a2db9e5a0",
        "x-user-role": "branch_admin",
      },
      raw: {
        rawHeaders: [
          "x-user-home-branch",
          "5f4fb5bb3156af7a2db9e5a0",
          "x-user-role",
          "branch_admin",
        ],
      },
    };
    assert.strictEqual(findDuplicateCriticalHeader(request), null);
  });
});
