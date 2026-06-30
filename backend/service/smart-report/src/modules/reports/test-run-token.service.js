import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOKEN_TTL_MS = 900_000;
const DEV_FALLBACK_SECRET = "local-dev-test-run-token-secret";
const TEST_FALLBACK_SECRET = "test-run-token-secret";

let warnedDevFallbackSecret = false;

function getTokenSecret() {
  const secret = process.env.TEST_RUN_TOKEN_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "test") {
    return TEST_FALLBACK_SECRET;
  }

  if (process.env.NODE_ENV === "development") {
    if (!warnedDevFallbackSecret) {
      warnedDevFallbackSecret = true;
      console.warn(
        "[TestRunToken] TEST_RUN_TOKEN_SECRET is not set; using a local-dev fallback. Add TEST_RUN_TOKEN_SECRET to .env (see .env.example).",
      );
    }
    return DEV_FALLBACK_SECRET;
  }

  throw new Error(
    "[TestRunToken] TEST_RUN_TOKEN_SECRET is required outside test and local development",
  );
}

function getTokenTtlMs() {
  const parsed = Number(process.env.TEST_RUN_TOKEN_TTL_MS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_TOKEN_TTL_MS;
}

/**
 * @param {string} value
 * @returns {string}
 */
export function digestScriptValue(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * @param {object} input
 * @param {string} input.script
 * @param {string} input.compiledScript
 * @param {number} input.recordCount
 * @param {number} input.durationMs
 * @returns {string}
 */
export function issueTestRunToken({
  script,
  compiledScript,
  recordCount,
  durationMs,
}) {
  const testedAt = Date.now();
  const payload = {
    scriptHash: digestScriptValue(script),
    compiledHash: digestScriptValue(compiledScript),
    recordCount,
    durationMs,
    testedAt,
    expiresAt: testedAt + getTokenTtlMs(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getTokenSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

/**
 * @param {string | undefined} token
 * @param {object} input
 * @param {string} input.script
 * @param {string} input.compiledScript
 * @returns {{ valid: boolean, reason?: string, testedAt?: Date, recordCount?: number, durationMs?: number }}
 */
export function verifyTestRunToken(token, { script, compiledScript }) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "missing" };
  }

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = createHmac("sha256", getTokenSecret())
    .update(payloadB64)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: "invalid-signature" };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { valid: false, reason: "malformed-payload" };
  }

  if (payload.expiresAt <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  if (payload.scriptHash !== digestScriptValue(script)) {
    return { valid: false, reason: "script-hash-mismatch" };
  }

  if (payload.compiledHash !== digestScriptValue(compiledScript)) {
    return { valid: false, reason: "compiled-hash-mismatch" };
  }

  return {
    valid: true,
    testedAt: new Date(payload.testedAt),
    recordCount: payload.recordCount,
    durationMs: payload.durationMs,
  };
}
