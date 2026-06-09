import test from "node:test";
import assert from "node:assert";
import { handleError } from "../request-handler.js";

const makeReply = () => {
  const sent = {};
  return {
    status(code) {
      sent.status = code;
      return this;
    },
    send(body) {
      sent.body = body;
      return this;
    },
    result: sent,
  };
};

test("handleError — maps known statusCode errors to their code without leaking message", () => {
  const reply = makeReply();
  const error = Object.assign(new Error("DB connection string exposed"), {
    statusCode: 404,
  });

  handleError(error, reply, "req-001");

  assert.strictEqual(reply.result.status, 404);
  assert.strictEqual(reply.result.body.code, "RESOURCE_NOT_FOUND");
  assert.strictEqual(
    reply.result.body.message,
    error.message,
    "known-status message is the thrown message",
  );
});

test("handleError — 500 fallback must not expose error.message to client", () => {
  const reply = makeReply();
  const error = new Error(
    "mongodb connection string: mongodb+srv://admin:secret@cluster.example.com",
  );

  handleError(error, reply, "req-002");

  assert.strictEqual(reply.result.status, 500);
  assert.strictEqual(reply.result.body.code, "INTERNAL_ERROR");
  assert.notStrictEqual(
    reply.result.body.message,
    error.message,
    "500 response must not echo internal error.message",
  );
  assert.ok(
    typeof reply.result.body.message === "string" &&
      reply.result.body.message.length > 0,
    "response must include a generic message string",
  );
});

test("handleError — throws when error has no message and no statusCode", () => {
  const reply = makeReply();
  const bare = new Error();
  bare.message = "";

  assert.throws(() => handleError(bare, reply, "req-003"));
});
