import { test, describe } from "node:test";
import assert from "node:assert";

import { HttpError } from "../../../lib/http-error.js";
import CODES from "../../../lib/error-codes.js";
import errorHandler from "../../error-handler.js";

/**
 * Minimal Fastify mock: captures status/payload sent by error handler.
 */
function createMockRequest(overrides = {}) {
  return {
    id: "req-test-001",
    log: {
      warn: () => {},
      error: () => {},
    },
    ...overrides,
  };
}

function createMockReply() {
  const state = { statusCode: null, payload: null, headers: {} };
  const reply = {
    header(key, value) {
      state.headers[key] = value;
      return reply;
    },
    status(code) {
      state.statusCode = code;
      return reply;
    },
    send(payload) {
      state.payload = payload;
      return state;
    },
  };
  return { reply, state };
}

/**
 * Extract error handler function from the fastify-plugin.
 * fastify-plugin wraps the async function; we call it with a mock fastify
 * that captures setErrorHandler.
 */
async function getErrorHandler() {
  let handler;
  const mockFastify = {
    setErrorHandler(fn) {
      handler = fn;
    },
  };

  // fastify-plugin returns an async fn that accepts (fastify, opts)
  const pluginFn = errorHandler[Symbol.for("fastify.display-name")]
    ? errorHandler
    : errorHandler;

  await pluginFn(mockFastify, {});
  return handler;
}

describe("error-handler plugin", async () => {
  const errorHandlerFn = await getErrorHandler();

  test("handles Fastify validation error", () => {
    const error = {
      validation: [
        {
          keyword: "required",
          instancePath: "",
          params: { missingProperty: "code" },
          message: "must have required property 'code'",
        },
      ],
    };

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 400);
    assert.strictEqual(state.payload.code, CODES.INVALID_PARAM);
    assert.strictEqual(state.payload.success, false);
    assert.strictEqual(state.payload.message, "Request validation failed");
    assert.ok(Array.isArray(state.payload.data));
  });

  test("handles HttpError", () => {
    const error = new HttpError(
      409,
      CODES.DUPLICATE,
      "A resource already exists",
    );

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 409);
    assert.strictEqual(state.payload.code, CODES.DUPLICATE);
    assert.strictEqual(state.payload.message, "A resource already exists");
  });

  test("handles MongoServerError code 18 (auth failure)", () => {
    const error = new Error("Authentication failed");
    error.name = "MongoServerError";
    error.code = 18;

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 500);
    assert.strictEqual(state.payload.code, CODES.DATASTORE_CREDENTIAL_REJECTED);
  });

  test("handles MongoServerError code 121 (document validation)", () => {
    const error = new Error("Document failed validation");
    error.name = "MongoServerError";
    error.code = 121;

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 400);
    assert.strictEqual(state.payload.code, CODES.INVALID_PARAM);
  });

  test("handles MongoServerError code 11000 (duplicate key)", () => {
    const error = new Error("E11000 duplicate key error");
    error.name = "MongoServerError";
    error.code = 11000;

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 409);
    assert.strictEqual(state.payload.code, CODES.DUPLICATE);
  });

  test("handles FST_ERR_CTP_INVALID_MEDIA_TYPE", () => {
    const error = new Error("Unsupported Media Type: text/xml");
    error.statusCode = 400;
    error.code = "FST_ERR_CTP_INVALID_MEDIA_TYPE";

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 415);
    assert.strictEqual(state.payload.code, CODES.UNSUPPORTED_MEDIA_TYPE);
  });

  test("handles invalid JSON body (Unexpected token)", () => {
    const error = new Error("Unexpected token } in JSON at position 42");
    error.statusCode = 400;

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 400);
    assert.strictEqual(state.payload.code, CODES.INVALID_JSON_BODY);
    assert.strictEqual(state.payload.message, "Request body is not valid JSON");
  });

  test("falls back to 500 INTERNAL_ERROR for unknown errors", () => {
    const error = new Error("Something unexpected happened");

    const request = createMockRequest();
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.statusCode, 500);
    assert.strictEqual(state.payload.code, CODES.INTERNAL_ERROR);
    assert.strictEqual(state.payload.message, "An internal error occurred");
  });

  test("always sets x-request-id header", () => {
    const error = new Error("Any error");

    const request = createMockRequest({ id: "custom-req-id-42" });
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.headers["x-request-id"], "custom-req-id-42");
  });

  test("requestId is included in error envelope", () => {
    const error = new HttpError(400, CODES.INVALID_PARAM, "Bad input");

    const request = createMockRequest({ id: "req-123" });
    const { reply, state } = createMockReply();

    errorHandlerFn(error, request, reply);

    assert.strictEqual(state.payload.requestId, "req-123");
  });
});
