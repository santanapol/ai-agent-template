import { test, describe, afterEach } from "node:test";
import assert from "node:assert";

import CODES from "../../../error-codes.js";
import { HttpError } from "../../../http-error.js";
import {
  createAuthInternalClient,
  mapAuthProblemToHttpError,
} from "../../auth-internal.client.js";

describe("mapAuthProblemToHttpError", () => {
  test("maps auth 400 policy violation to INVALID_PARAM", () => {
    const error = mapAuthProblemToHttpError(400, {
      code: "AUTH_PASSWORD_POLICY_VIOLATION",
      detail: "Password too short",
    });
    assert.strictEqual(error.status, 400);
    assert.strictEqual(error.code, CODES.INVALID_PARAM);
  });

  test("maps auth duplicate to DUPLICATE", () => {
    const error = mapAuthProblemToHttpError(409, {
      code: "DUPLICATE",
      detail: "Username already exists",
    });
    assert.strictEqual(error.status, 409);
    assert.strictEqual(error.code, CODES.DUPLICATE);
  });

  test("maps auth not ready to SERVICE_UNAVAILABLE", () => {
    const error = mapAuthProblemToHttpError(503, {
      code: "AUTH_NOT_READY",
      detail: "Not ready",
    });
    assert.strictEqual(error.status, 503);
    assert.strictEqual(error.code, CODES.SERVICE_UNAVAILABLE);
  });
});

describe("createAuthInternalClient", () => {
  afterEach(() => {
    // no global state in these tests
  });

  test("provisionUser returns user id on 201", async () => {
    const httpClient = {
      post: async () => ({
        status: 201,
        data: { id: "507f1f77bcf86cd799439099" },
      }),
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      httpClient,
    });

    const result = await client.provisionUser({
      username: "new.user",
      password: "InitialSecurePass1234!",
      ouId: "507f1f77bcf86cd799439011",
      branchId: "507f1f77bcf86cd799439012",
    });

    assert.strictEqual(result.userId, "507f1f77bcf86cd799439099");
  });

  test("provisionUser maps 409 problem to DUPLICATE", async () => {
    const httpClient = {
      post: async () => ({
        status: 409,
        data: {
          code: "DUPLICATE",
          detail: "Username already exists",
        },
      }),
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      httpClient,
    });

    await assert.rejects(
      () =>
        client.provisionUser({
          username: "taken",
          password: "InitialSecurePass1234!",
          ouId: "507f1f77bcf86cd799439011",
          branchId: "507f1f77bcf86cd799439012",
        }),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 409);
        assert.strictEqual(error.code, CODES.DUPLICATE);
        return true;
      },
    );
  });

  test("revokeUserSessions retries then throws STAFF_AUTH_REVOKE_PENDING", async () => {
    let calls = 0;
    const httpClient = {
      post: async (url) => {
        calls += 1;
        assert.match(url, /\/sessions\/revoke$/);
        return { status: 503, data: { code: "AUTH_NOT_READY" } };
      },
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      revokeMaxRetries: 2,
      revokeBackoffMs: 0,
      httpClient,
    });

    await assert.rejects(
      () =>
        client.revokeUserSessions({
          userId: "507f1f77bcf86cd799439099",
          maxRetries: 2,
          backoffMs: 0,
          sleepFn: async () => {},
        }),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 503);
        assert.strictEqual(error.code, CODES.STAFF_AUTH_REVOKE_PENDING);
        return true;
      },
    );
    assert.strictEqual(calls, 2);
  });

  test("setUserPassword succeeds on 204", async () => {
    let capturedBody;
    const httpClient = {
      post: async (_url, body) => {
        capturedBody = body;
        return { status: 204, data: null };
      },
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      httpClient,
    });

    await client.setUserPassword({
      userId: "507f1f77bcf86cd799439099",
      password: "NewSecurePass1234!",
      revokeSessions: false,
      correlationId: "req-1",
    });

    assert.strictEqual(capturedBody.password, "NewSecurePass1234!");
    assert.strictEqual(capturedBody.revoke_sessions, false);
    assert.strictEqual(capturedBody.reason, "staff.admin_password_reset");
  });

  test("setUserPassword maps auth failure to SERVICE_UNAVAILABLE", async () => {
    const httpClient = {
      post: async () => ({
        status: 503,
        data: { code: "AUTH_NOT_READY", detail: "down" },
      }),
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      httpClient,
    });

    await assert.rejects(
      () =>
        client.setUserPassword({
          userId: "507f1f77bcf86cd799439099",
          password: "NewSecurePass1234!",
        }),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 503);
        assert.strictEqual(error.code, CODES.SERVICE_UNAVAILABLE);
        return true;
      },
    );
  });

  test("revokeUserSessions succeeds on 204", async () => {
    const httpClient = {
      post: async () => ({ status: 204, data: null }),
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      httpClient,
    });

    await client.revokeUserSessions({
      userId: "507f1f77bcf86cd799439099",
      sleepFn: async () => {},
    });
  });

  test("provisionUser maps unexpected failure to SERVICE_UNAVAILABLE", async () => {
    const httpClient = {
      post: async () => {
        throw new Error("connect ECONNREFUSED");
      },
    };

    const client = createAuthInternalClient({
      baseUrl: "http://auth.test",
      serviceSecret: "secret",
      defaultRole: "staff",
      httpClient,
    });

    await assert.rejects(
      () =>
        client.provisionUser({
          username: "new.user",
          password: "InitialSecurePass1234!",
          ouId: "507f1f77bcf86cd799439011",
          branchId: "507f1f77bcf86cd799439012",
        }),
      (error) => {
        assert.ok(error instanceof HttpError);
        assert.strictEqual(error.status, 503);
        assert.strictEqual(error.code, CODES.SERVICE_UNAVAILABLE);
        return true;
      },
    );
  });
});
