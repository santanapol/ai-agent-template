const REQUIRED_IN_PRODUCTION = [
  "MONGODB_URI",
  "GATEWAY_SHARED_SECRET",
  "DB_NAME",
];

export function readEnv() {
  const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3003),
    dbName: process.env.DB_NAME || "service-demo",
    mongoUri: process.env.MONGODB_URI || "",
    gatewaySharedSecret: process.env.GATEWAY_SHARED_SECRET || "",
    appName: process.env.APP_NAME || "crud-service",
    shutdownTimeoutMs: Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000),
    requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 30000),
    bodyLimit: process.env.BODY_LIMIT || "1mb",
    rateLimitStore: process.env.RATE_LIMIT_STORE || "memory",
    maxPoolSize: Number(process.env.MAX_POOL_SIZE || 10),
    minPoolSize: Number(process.env.MIN_POOL_SIZE || 2),
  };

  if (env.nodeEnv === "production") {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required env in production: ${missing.join(", ")}`,
      );
    }
  }

  return env;
}
