import { test, describe } from "node:test";
import assert from "node:assert";
import errorHandlerPlugin from "../../error-handler.js";

describe("error-handler", () => {
  test("registers error handler and formats various errors", async () => {
    let registeredHandler = null;
    const fastify = {
      setErrorHandler: (fn) => {
        registeredHandler = fn;
      },
    };

    await errorHandlerPlugin(fastify, {});
    assert.ok(registeredHandler);

    const logs = [];
    const request = {
      id: "req-1",
      log: {
        warn: (...args) => logs.push(["warn", ...args]),
        error: (...args) => logs.push(["error", ...args]),
      },
    };

    const makeReply = () => {
      const res = {
        statusCode: null,
        body: null,
        headers: {},
        header: function (k, v) {
          this.headers[k] = v;
          return this;
        },
        status: function (code) {
          this.statusCode = code;
          return this;
        },
        send: function (body) {
          this.body = body;
          return this;
        },
      };
      return res;
    };

    // 1. Validation Error
    const valReply = makeReply();
    registeredHandler(
      { validation: [{ keyword: "required" }] },
      request,
      valReply,
    );
    assert.strictEqual(valReply.statusCode, 400);
    assert.strictEqual(valReply.body.code, "INVALID_PARAM");

    // 2. MongoServerError 18 (Auth failed)
    const mongo18Reply = makeReply();
    registeredHandler(
      { name: "MongoServerError", code: 18 },
      request,
      mongo18Reply,
    );
    assert.strictEqual(mongo18Reply.statusCode, 500);

    // 3. MongoServerError 121 (Doc validation)
    const mongo121Reply = makeReply();
    registeredHandler(
      { name: "MongoServerError", code: 121 },
      request,
      mongo121Reply,
    );
    assert.strictEqual(mongo121Reply.statusCode, 400);

    // 4. MongoServerError 11000 (Duplicate)
    const mongo11000Reply = makeReply();
    registeredHandler(
      { name: "MongoServerError", code: 11000 },
      request,
      mongo11000Reply,
    );
    assert.strictEqual(mongo11000Reply.statusCode, 409);

    // 5. Fastify FST_ERR_CTP_INVALID_MEDIA_TYPE
    const fstMediaReply = makeReply();
    registeredHandler(
      { statusCode: 400, code: "FST_ERR_CTP_INVALID_MEDIA_TYPE" },
      request,
      fstMediaReply,
    );
    assert.strictEqual(fstMediaReply.statusCode, 415);

    // 6. Fastify FST_ERR_CTP_BODY_TOO_LARGE
    const fstLargeReply = makeReply();
    registeredHandler(
      { statusCode: 400, code: "FST_ERR_CTP_BODY_TOO_LARGE" },
      request,
      fstLargeReply,
    );
    assert.strictEqual(fstLargeReply.statusCode, 413);

    // 7. Fastify FST_ERR_CTP_EMPTY_JSON_BODY
    const fstEmptyReply = makeReply();
    registeredHandler(
      { statusCode: 400, code: "FST_ERR_CTP_EMPTY_JSON_BODY" },
      request,
      fstEmptyReply,
    );
    assert.strictEqual(fstEmptyReply.statusCode, 400);

    // 8. Fallback 500
    const fallbackReply = makeReply();
    registeredHandler(new Error("Unknown"), request, fallbackReply);
    assert.strictEqual(fallbackReply.statusCode, 500);
  });
});
