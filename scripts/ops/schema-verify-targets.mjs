/**
 * Shared env targets for validator apply + verify scripts.
 * @typedef {{ envFile: string, uriKey: string, dbKey: string | null, registryDb: string }} VerifyTarget
 */

/** @type {VerifyTarget[]} */
export const HARNESS_TARGETS = [
  {
    envFile: "backend/auth/.env.harness",
    uriKey: "DATABASE_URI",
    dbKey: null,
    registryDb: "zero-platform",
  },
  {
    envFile: "backend/service/agent-invoice/.env.harness",
    uriKey: "MONGODB_URI",
    dbKey: "DB_NAME",
    registryDb: "zero-agent-invoice",
  },
  {
    envFile: "backend/service/smart-report/.env.harness",
    uriKey: "MONGODB_URI",
    dbKey: "DB_NAME",
    registryDb: "zero-smart-report",
  },
];

/** @type {VerifyTarget[]} */
export const STAGING_TARGETS = [
  {
    envFile: "backend/auth/.env.staging",
    uriKey: "DATABASE_URI",
    dbKey: null,
    registryDb: "zero-platform",
  },
  {
    envFile: "backend/service/agent-invoice/.env.staging",
    uriKey: "MONGODB_URI",
    dbKey: "DB_NAME",
    registryDb: "zero-agent-invoice",
  },
  {
    envFile: "backend/service/smart-report/.env.staging",
    uriKey: "MONGODB_URI",
    dbKey: "DB_NAME",
    registryDb: "zero-smart-report",
  },
];

/** Apply script shape: { env, db } */
export const PROD_APPLY_TARGETS = [
  { env: "backend/auth/.env.prod", db: "zero-platform" },
  { env: "backend/service/agent-invoice/.env.prod", db: "zero-agent-invoice" },
  { env: "backend/service/smart-report/.env.prod", db: "zero-smart-report" },
];

export const STAGING_APPLY_TARGETS = STAGING_TARGETS.map((t) => ({
  env: t.envFile,
  db: t.registryDb,
}));

export const DEFAULT_PROD_BASELINE =
  "docs/audit/prod-schema-baseline-2026-07-15.json";

export function resolveDbName(env, uriKey, dbKey) {
  if (dbKey && env[dbKey]) return env[dbKey];
  try {
    const uri = env[uriKey] || env.DATABASE_URI || env.MONGODB_URI;
    if (!uri) return null;
    return new URL(
      uri.replace("mongodb+srv://", "http://").replace("mongodb://", "http://"),
    ).pathname
      .replace(/^\//, "")
      .split("?")[0];
  } catch {
    return null;
  }
}

export function parseEnvFile(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

/** @param {string} liveDb @param {string} baselineDb */
export function matchBaselineDatabase(liveDb, baselineDb) {
  return (
    liveDb === baselineDb ||
    liveDb === `${baselineDb}_0` ||
    `${liveDb}_0` === baselineDb ||
    liveDb.replace(/_0$/, "") === baselineDb
  );
}
