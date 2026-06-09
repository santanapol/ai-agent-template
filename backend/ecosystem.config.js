module.exports = {
  apps: [
    {
      name: "zero-auth",
      script: "src/server.js",
      cwd: __dirname + "/auth",
      node_args: "--env-file=.env.prod --enable-source-maps",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "zero-gateway",
      script: "src/server.js",
      cwd: __dirname + "/gateway",
      node_args: "--env-file=.env.prod --enable-source-maps",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "zero-staff",
      script: "src/server.js",
      cwd: __dirname + "/service/staff",
      node_args: "--env-file=.env.prod --enable-source-maps",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "zero-agent-invoice",
      script: "src/server.js",
      cwd: __dirname + "/service/agent-invoice",
      node_args: "--env-file=.env.prod --enable-source-maps",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
