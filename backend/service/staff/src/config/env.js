const REQUIRED_IN_PRODUCTION = [
  "MONGODB_URI",
  "GATEWAY_SHARED_SECRET",
  "DB_NAME",
  "AUTH_INTERNAL_BASE_URL",
  "AUTH_INTERNAL_SERVICE_SECRET",
];

const DISALLOWED_SHARED_SECRETS = new Set([
  "test-gateway-secret-32-chars-minimum!!",
  "staff-internal-secret-32-chars-min!!",
  "internal-secret",
  "changeme",
  "change-me",
]);

function readBooleanEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

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

export function readEnv() {
  const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3101),
    dbName: process.env.DB_NAME || "auth_login",
    mongoUri: process.env.MONGODB_URI || "",
    gatewaySharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
    authInternalBaseUrl:
      process.env.AUTH_INTERNAL_BASE_URL || "http://127.0.0.1:3001",
    authInternalServiceSecret: process.env.AUTH_INTERNAL_SERVICE_SECRET || "",
    staffProvisionDefaultRole:
      process.env.STAFF_PROVISION_DEFAULT_ROLE || "staff",
    appName: process.env.APP_NAME || "staff-service",
    shutdownTimeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000),
    bodyLimit: process.env.BODY_LIMIT || "1mb",
    maxPoolSize: Number(process.env.MAX_POOL_SIZE || 10),
    minPoolSize: Number(process.env.MIN_POOL_SIZE || 2),
    authRevokeMaxRetries: Number(process.env.AUTH_REVOKE_MAX_RETRIES || 3),
    authRevokeBackoffMs: Number(process.env.AUTH_REVOKE_BACKOFF_MS || 200),
    metricsEnabled: readBooleanEnv("METRICS_ENABLED", false),
  };

  if (env.nodeEnv === "production") {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required env in production: ${missing.join(", ")}`,
      );
    }
    assertProductionSecret("GATEWAY_SHARED_SECRET", env.gatewaySharedSecret);
    assertProductionSecret(
      "AUTH_INTERNAL_SERVICE_SECRET",
      env.authInternalServiceSecret,
    );
  }

  return env;
}
