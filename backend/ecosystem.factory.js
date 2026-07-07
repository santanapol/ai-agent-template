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
 * @param {string} envFileName e.g. ".env.prod" | ".env.staging"
 * @param {{ nodeEnv?: string; appEnv?: string }} [options]
 */
function createEcosystemConfig(envFileName, { nodeEnv = "production", appEnv } = {}) {
  return {
    apps: APPS.map(({ name, dir }) => ({
      name,
      script: "src/server.js",
      cwd: path.join(__dirname, dir),
      node_args: `--env-file=${path.join(__dirname, dir, envFileName)} --enable-source-maps`,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: nodeEnv,
        ...(appEnv ? { APP_ENV: appEnv } : {}),
      },
    })),
  };
}

module.exports = { createEcosystemConfig, APPS };
