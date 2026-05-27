import pino from "pino";
import fs from "node:fs";

const REDACT_PATHS = [
  'req.headers["x-gateway-secret"]',
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "req.body.password",
  "req.body.token",
  "req.body.refreshToken",
  "req.body.secret",
  "req.body.apiKey",
  "*.password",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "*.secret",
  "process.env.GATEWAY_SECRET",
  "process.env.GATEWAY_SHARED_SECRET",
  "process.env.MONGODB_URI",
];

function defaultLevel() {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  if (process.env.NODE_ENV === "production") return "warn";
  if (process.env.NODE_ENV === "test") return "silent";
  return "info";
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../../package.json", import.meta.url)),
    );
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}

function isPinoPrettyAvailable() {
  try {
    import.meta.resolve("pino-pretty");
    return true;
  } catch {
    return false;
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
const usePrettyTransport =
  nodeEnv !== "production" &&
  nodeEnv !== "test" &&
  process.env.LOG_PRETTY !== "false" &&
  isPinoPrettyAvailable();

const baseOptions = {
  level: defaultLevel(),
  base: {
    service: process.env.APP_NAME || "crud-service",
    version: process.env.APP_VERSION || readPackageVersion(),
    env: nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
    remove: false,
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
};

const logger = usePrettyTransport
  ? pino({
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true,
        },
      },
    })
  : pino(baseOptions);

export default logger;
