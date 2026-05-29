import { test, describe } from "node:test";
import assert from "node:assert";

import { revokeBackoffDelayMs } from "../../sleep.js";

describe("revokeBackoffDelayMs", () => {
  test("applies exponential backoff from base delay", () => {
    assert.strictEqual(revokeBackoffDelayMs(0, 200), 200);
    assert.strictEqual(revokeBackoffDelayMs(1, 200), 400);
    assert.strictEqual(revokeBackoffDelayMs(2, 200), 800);
  });
});
