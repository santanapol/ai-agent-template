import { test, describe } from "node:test";
import assert from "node:assert/strict";

import duplicateHeaderGuard from "../../duplicate-header.js";
import { HttpError } from "../../../lib/http-error.js";
import CODES from "../../../lib/error-codes.js";

async function getOnRequestHook() {
  const hooks = [];
  const fastifyStub = {
    addHook: (name, fn) => hooks.push([name, fn]),
  };
  await duplicateHeaderGuard(fastifyStub, {});
  return hooks.find(([name]) => name === "onRequest")[1];
}

describe("duplicateHeaderGuard", () => {
  test("allows requests with no duplicated critical headers", async () => {
    const onRequest = await getOnRequestHook();
    const request = {
      raw: {
        rawHeaders: [
          "x-gateway-secret",
          "secret",
          "x-user-id",
          "abc",
          "content-type",
          "application/json",
        ],
      },
    };

    await assert.doesNotReject(() => onRequest(request));
  });

  test("rejects requests with a duplicated critical header (400 INVALID_HEADER)", async () => {
    const onRequest = await getOnRequestHook();
    const request = {
      raw: {
        rawHeaders: ["x-user-id", "a", "x-user-id", "b"],
      },
    };

    await assert.rejects(
      () => onRequest(request),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.status, 400);
        assert.equal(error.code, CODES.INVALID_HEADER);
        return true;
      },
    );
  });
});
