const { createEcosystemConfig } = require("./ecosystem.factory");

module.exports = createEcosystemConfig(".env.staging", { appEnv: "staging" });
