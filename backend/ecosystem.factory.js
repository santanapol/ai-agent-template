const path = require("path");

const APPS = [
  { name: "zero-auth", dir: "auth" },
  { name: "zero-gateway", dir: "gateway" },
  { name: "zero-staff", dir: "service/staff" },
  { name: "zero-agent-invoice", dir: "service/agent-invoice" },
  { name: "zero-smart-report", dir: "service/smart-report" },
  { name: "zero-branch-report", dir: "service/branch-report" },
];

/**
 * PM2 memory budgets per host profile.
 * - maxMemoryRestart: PM2 restarts the process when RSS exceeds this (soft cap).
 * - heapMb: V8 --max-old-space-size via NODE_OPTIONS (harder heap cap).
 *
 * Budgets assume a 2 vCPU / 2GB droplet. Production uses Atlas (no local Mongo);
 * staging co-hosts Mongo + Redis — tighter Node limits.
 */
const MEMORY_PROFILES = {
  small: {
    backends: {
      "zero-auth": { maxMemoryRestart: "200M", heapMb: 144 },
      "zero-gateway": { maxMemoryRestart: "140M", heapMb: 112 },
      "zero-staff": { maxMemoryRestart: "160M", heapMb: 128 },
      "zero-agent-invoice": { maxMemoryRestart: "200M", heapMb: 144 },
      "zero-smart-report": { maxMemoryRestart: "180M", heapMb: 132 },
      "zero-branch-report": { maxMemoryRestart: "140M", heapMb: 112 },
    },
    backoffice: { maxMemoryRestart: "380M", heapMb: 300 },
  },
  "small-with-deps": {
    backends: {
      "zero-auth": { maxMemoryRestart: "160M", heapMb: 128 },
      "zero-gateway": { maxMemoryRestart: "120M", heapMb: 96 },
      "zero-staff": { maxMemoryRestart: "140M", heapMb: 112 },
      "zero-agent-invoice": { maxMemoryRestart: "160M", heapMb: 128 },
      "zero-smart-report": { maxMemoryRestart: "140M", heapMb: 112 },
      "zero-branch-report": { maxMemoryRestart: "120M", heapMb: 96 },
    },
    backoffice: { maxMemoryRestart: "300M", heapMb: 256 },
  },
  standard: {
    defaultBackend: { maxMemoryRestart: "512M", heapMb: 384 },
    backoffice: { maxMemoryRestart: "768M", heapMb: 512 },
  },
};

const BACKOFFICE_APP = {
  name: "zero-backoffice",
  script: "node_modules/next/dist/bin/next",
  args: "start -p 3005",
  cwd: path.join(__dirname, "../frontend/backoffice-next"),
  instances: 1,
  autorestart: true,
  watch: false,
};

function resolveMemory(profile, appName, kind = "backend") {
  const config = MEMORY_PROFILES[profile] ?? MEMORY_PROFILES.standard;

  if (kind === "backoffice") {
    return config.backoffice ?? MEMORY_PROFILES.standard.backoffice;
  }

  return (
    config.backends?.[appName] ??
    config.defaultBackend ?? { maxMemoryRestart: "256M", heapMb: 192 }
  );
}

function buildNodeOptions(heapMb, extra = "") {
  const heapFlag = `--max-old-space-size=${heapMb}`;
  return extra ? `${extra} ${heapFlag}` : heapFlag;
}

/**
 * @param {string} envFileName e.g. ".env.prod" | ".env.staging"
 * @param {{ nodeEnv?: string; appEnv?: string; memoryProfile?: keyof typeof MEMORY_PROFILES }} [options]
 */
function createEcosystemConfig(
  envFileName,
  { nodeEnv = "production", appEnv, memoryProfile = "standard" } = {},
) {
  const backendApps = APPS.map(({ name, dir }) => {
    const { maxMemoryRestart, heapMb } = resolveMemory(memoryProfile, name, "backend");

    return {
      name,
      script: "src/server.js",
      cwd: path.join(__dirname, dir),
      node_args: `--env-file=${path.join(__dirname, dir, envFileName)} --enable-source-maps`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: maxMemoryRestart,
      min_uptime: "10s",
      max_restarts: 10,
      env: {
        NODE_ENV: nodeEnv,
        NODE_OPTIONS: buildNodeOptions(heapMb),
        ...(appEnv ? { APP_ENV: appEnv } : {}),
      },
    };
  });

  const backofficeMemory = resolveMemory(memoryProfile, "zero-backoffice", "backoffice");

  return {
    apps: [
      ...backendApps,
      {
        ...BACKOFFICE_APP,
        max_memory_restart: backofficeMemory.maxMemoryRestart,
        min_uptime: "10s",
        max_restarts: 10,
        env: {
          NODE_ENV: nodeEnv,
          NODE_OPTIONS: buildNodeOptions(backofficeMemory.heapMb),
          PORT: "3005",
          ...(appEnv ? { APP_ENV: appEnv } : {}),
        },
      },
    ],
  };
}

module.exports = {
  createEcosystemConfig,
  APPS,
  BACKOFFICE_APP,
  MEMORY_PROFILES,
  resolveMemory,
};
