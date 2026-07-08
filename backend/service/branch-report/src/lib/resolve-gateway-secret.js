/**
 * Resolves gateway shared secret for mesh auth.
 * Tests may pass `options.gatewaySecret`; production requires `GATEWAY_SHARED_SECRET` env.
 *
 * @param {{ gatewaySecret?: string }} [options]
 * @returns {string}
 */
const DISALLOWED_SHARED_SECRETS = new Set([
  "test-gateway-secret-32-chars-minimum!!",
  "staff-internal-secret-32-chars-min!!",
  "internal-secret",
  "changeme",
  "change-me",
]);

function assertProductionSecret(name, value) {
  if (typeof value !== "string" || value.trim().length < 24) {
    throw new Error(`${name} must be at least 24 characters in production`);
  }
  if (DISALLOWED_SHARED_SECRETS.has(value.trim())) {
    throw new Error(
      `${name} uses a known sample value; set a unique secret in production`,
    );
  }
}

export function resolveGatewaySecret(options = {}) {
  if (options.gatewaySecret) {
    return options.gatewaySecret;
  }

  const fromEnv = process.env.GATEWAY_SHARED_SECRET?.trim();
  if (fromEnv) {
    if (process.env.NODE_ENV === "production") {
      assertProductionSecret("GATEWAY_SHARED_SECRET", fromEnv);
    }
    return fromEnv;
  }

  if (process.env.NODE_ENV === "test") {
    return "test-gateway-secret";
  }

  throw new Error("GATEWAY_SHARED_SECRET is required");
}
