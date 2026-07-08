import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findDuplicateCriticalHeader } from "./critical-headers.js";

describe("findDuplicateCriticalHeader", () => {
  it("returns null when critical headers are single values", () => {
    const request = {
      headers: {
        "x-gateway-secret": "secret",
        "x-user-ou": "ou-1",
        "x-user-branch": "branch-1",
      },
    };

    assert.equal(findDuplicateCriticalHeader(request), null);
  });

  it("returns header name when a critical header is comma-joined (spoofing)", () => {
    const request = {
      headers: {
        "x-user-branch": "branch-a, branch-b",
      },
    };

    assert.equal(findDuplicateCriticalHeader(request), "x-user-branch");
  });
});
