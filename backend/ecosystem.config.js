const { createEcosystemConfig } = require("./ecosystem.factory");

module.exports = createEcosystemConfig(".env.prod", { appEnv: "production" });
