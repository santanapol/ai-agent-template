import axios, { isAxiosError } from "axios";

import { HttpError } from "../http-error.js";
import CODES from "../error-codes.js";
import { revokeBackoffDelayMs, sleep } from "../utils/sleep.js";

const AUTH_INVALID_REQUEST_CODES = new Set([
  "AUTH_INVALID_REQUEST",
  "AUTH_PASSWORD_POLICY_VIOLATION",
  "AUTH_PASSWORD_UNCHANGED",
]);

const AUTH_DUPLICATE_CODES = new Set([
  "DUPLICATE",
  "AUTH_DUPLICATE",
  "AUTH_USER_ALREADY_EXISTS",
]);

/**
 * Map auth RFC 7807 problem+json to staff HttpError.
 * @param {number} status
 * @param {{ code?: string, detail?: string, title?: string } | undefined} problem
 */
export function mapAuthProblemToHttpError(status, problem) {
  const authCode = problem?.code;
  const detail =
    typeof problem?.detail === "string" && problem.detail.trim()
      ? problem.detail
      : typeof problem?.title === "string"
        ? problem.title
        : "Auth request failed";

  if (status === 409 || AUTH_DUPLICATE_CODES.has(authCode)) {
    return new HttpError(409, CODES.DUPLICATE, detail);
  }

  if (status === 400 || AUTH_INVALID_REQUEST_CODES.has(authCode)) {
    return new HttpError(400, CODES.INVALID_PARAM, detail);
  }

  if (status === 404 || authCode === "AUTH_USER_NOT_FOUND") {
    return new HttpError(404, CODES.RESOURCE_NOT_FOUND, detail);
  }

  if (status === 503 || status >= 500 || authCode === "AUTH_NOT_READY") {
    return new HttpError(
      503,
      CODES.SERVICE_UNAVAILABLE,
      "Auth service is temporarily unavailable",
    );
  }

  return new HttpError(
    503,
    CODES.SERVICE_UNAVAILABLE,
    "Auth service is temporarily unavailable",
  );
}

/**
 * @param {import('axios').AxiosError} error
 */
function mapAxiosFailure(error) {
  if (error.response) {
    const status = error.response.status;
    const problem =
      error.response.data && typeof error.response.data === "object"
        ? error.response.data
        : undefined;
    return mapAuthProblemToHttpError(status, problem);
  }

  return new HttpError(
    503,
    CODES.SERVICE_UNAVAILABLE,
    "Auth service is temporarily unavailable",
  );
}

/**
 * @param {{ baseUrl: string, serviceSecret: string, defaultRole: string, timeoutMs?: number, revokeMaxRetries?: number, revokeBackoffMs?: number, httpClient?: import('axios').AxiosInstance }} config
 */
export function createAuthInternalClient(config) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const http = config.httpClient ?? axios;
  const timeoutMs = config.timeoutMs ?? 10_000;
  const revokeMaxRetries = config.revokeMaxRetries ?? 3;
  const revokeBackoffMs = config.revokeBackoffMs ?? 200;

  return {
    /**
     * @param {{ username: string, password: string, role?: string, ouId: string, branchId: string }} input
     */
    async provisionUser(input) {
      try {
        const response = await http.post(
          `${baseUrl}/internal/users`,
          {
            username: input.username,
            password: input.password,
            role: input.role ?? config.defaultRole,
            ou_id: input.ouId,
            branch_id: input.branchId,
          },
          {
            headers: authInternalHeaders(config.serviceSecret),
            timeout: timeoutMs,
            validateStatus: () => true,
          },
        );

        if (response.status === 201) {
          const userId = response.data?.id ?? response.data?.user_id;
          if (!userId) {
            throw new HttpError(
              503,
              CODES.SERVICE_UNAVAILABLE,
              "Auth provision response missing user id",
            );
          }
          return { userId: String(userId) };
        }

        const problem =
          response.data && typeof response.data === "object"
            ? response.data
            : undefined;
        throw mapAuthProblemToHttpError(response.status, problem);
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        if (isAxiosError(error)) {
          throw mapAxiosFailure(error);
        }
        throw new HttpError(
          503,
          CODES.SERVICE_UNAVAILABLE,
          "Auth service is temporarily unavailable",
        );
      }
    },

    /**
     * @param {{ userId: string, correlationId?: string, maxRetries?: number, backoffMs?: number, sleepFn?: (ms: number) => Promise<void> }} input
     */
    async revokeUserSessions(input) {
      const maxRetries = input.maxRetries ?? revokeMaxRetries;
      const baseBackoffMs = input.backoffMs ?? revokeBackoffMs;
      const sleepFn = input.sleepFn ?? sleep;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const ok = await tryRevokeUserSessions(
          http,
          baseUrl,
          config.serviceSecret,
          timeoutMs,
          input.userId,
          input.correlationId,
        );
        if (ok) {
          return;
        }

        if (attempt < maxRetries - 1) {
          await sleepFn(revokeBackoffDelayMs(attempt, baseBackoffMs));
        }
      }

      throw new HttpError(
        503,
        CODES.STAFF_AUTH_REVOKE_PENDING,
        "Profile archived but session revoke is still pending",
      );
    },

    /**
     * @param {{ userId: string, password: string, revokeSessions?: boolean, correlationId?: string }} input
     */
    async setUserPassword(input) {
      try {
        const response = await http.post(
          `${baseUrl}/internal/users/${input.userId}/password`,
          {
            password: input.password,
            revoke_sessions: input.revokeSessions ?? true,
            reason: "staff.admin_password_reset",
            correlation_id: input.correlationId,
          },
          {
            headers: authInternalHeaders(config.serviceSecret),
            timeout: timeoutMs,
            validateStatus: () => true,
          },
        );

        if (response.status === 204) {
          return;
        }

        const problem =
          response.data && typeof response.data === "object"
            ? response.data
            : undefined;
        throw mapAuthProblemToHttpError(response.status, problem);
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        if (isAxiosError(error)) {
          throw mapAxiosFailure(error);
        }
        throw new HttpError(
          503,
          CODES.SERVICE_UNAVAILABLE,
          "Auth service is temporarily unavailable",
        );
      }
    },
  };
}

/**
 * @param {string} serviceSecret
 */
function authInternalHeaders(serviceSecret) {
  return {
    Authorization: `Bearer ${serviceSecret}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/**
 * @param {import('axios').AxiosInstance} http
 */
async function tryRevokeUserSessions(
  http,
  baseUrl,
  serviceSecret,
  timeoutMs,
  userId,
  correlationId,
) {
  try {
    const response = await http.post(
      `${baseUrl}/internal/users/${userId}/sessions/revoke`,
      {
        reason: "staff.profile_archive",
        correlation_id: correlationId,
      },
      {
        headers: authInternalHeaders(serviceSecret),
        timeout: timeoutMs,
        validateStatus: () => true,
      },
    );

    return response.status === 200 || response.status === 204;
  } catch (error) {
    if (error instanceof HttpError) {
      return false;
    }
    if (isAxiosError(error)) {
      return false;
    }
    return false;
  }
}

/** @type {ReturnType<typeof createAuthInternalClient> | null} */
let defaultClient = null;

/** @type {unknown} */
let cachedEnvForClient = null;

/** @type {ReturnType<typeof createAuthInternalClient> | null} */
let testClientOverride = null;

/**
 * @param {ReturnType<typeof import('../../config/env.js').readEnv>} env
 */
export function getAuthInternalClient(env) {
  if (testClientOverride) {
    return testClientOverride;
  }

  if (!defaultClient || env !== cachedEnvForClient) {
    cachedEnvForClient = env;
    defaultClient = createAuthInternalClient({
      baseUrl: env.authInternalBaseUrl,
      serviceSecret: env.authInternalServiceSecret,
      defaultRole: env.staffProvisionDefaultRole,
      revokeMaxRetries: env.authRevokeMaxRetries,
      revokeBackoffMs: env.authRevokeBackoffMs,
    });
  }

  return defaultClient;
}

/** @param {ReturnType<typeof createAuthInternalClient> | null} client */
export function setAuthInternalClientForTests(client) {
  testClientOverride = client;
}

export function resetAuthInternalClientForTests() {
  testClientOverride = null;
  defaultClient = null;
  cachedEnvForClient = null;
}
