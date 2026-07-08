import { test, describe } from "node:test";
import assert from "node:assert";

import { readEnv } from "../../env.js";

function withEnv(tempEnv, fn) {
  const previous = { ...process.env };
  process.env = { ...previous, ...tempEnv };
  try {
    return fn();
  } finally {
    process.env = previous;
  }
}

describe("readEnv production secret guards", () => {
  test("rejects known sample gateway secret in production", () => {
    assert.throws(
      () =>
        withEnv(
          {
            NODE_ENV: "production",
            MONGODB_URI: "mongodb://127.0.0.1:27017/zero-platform",
            DB_NAME: "zero-platform",
            AUTH_INTERNAL_BASE_URL: "http://127.0.0.1:3001",
            AUTH_INTERNAL_SERVICE_SECRET:
              "prod-internal-secret-that-is-long-enough",
            GATEWAY_SHARED_SECRET: "test-gateway-secret-32-chars-minimum!!",
          },
          () => readEnv(),
        ),
      /known sample value/,
    );
  });

  test("rejects short auth internal secret in production", () => {
    assert.throws(
      () =>
        withEnv(
          {
            NODE_ENV: "production",
            MONGODB_URI: "mongodb://127.0.0.1:27017/zero-platform",
            DB_NAME: "zero-platform",
            AUTH_INTERNAL_BASE_URL: "http://127.0.0.1:3001",
            AUTH_INTERNAL_SERVICE_SECRET: "too-short",
            GATEWAY_SHARED_SECRET: "prod-gateway-secret-that-is-long-enough",
          },
          () => readEnv(),
        ),
      /at least 24 characters/,
    );
  });
});

describe("readEnv PERMISSION_MODE validation", () => {
  test("accepts 'dual' and 'enforce'", () => {
    assert.doesNotThrow(() =>
      withEnv({ PERMISSION_MODE: "dual" }, () => readEnv()),
    );
    assert.doesNotThrow(() =>
      withEnv({ PERMISSION_MODE: "enforce" }, () => readEnv()),
    );
  });

  test("rejects invalid PERMISSION_MODE", () => {
    assert.throws(
      () => withEnv({ PERMISSION_MODE: "strict" }, () => readEnv()),
      /Invalid PERMISSION_MODE: strict/,
    );
  });
});
