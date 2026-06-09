module.exports = {
  apps: [
    {
      name: "zero-auth",
      script: "src/server.js",
      cwd: "./auth",
      node_args: "--env-file=.env.defaults --env-file=.env --enable-source-maps",
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
      cwd: "./gateway",
      node_args: "--env-file=.env.defaults --env-file=.env --enable-source-maps",
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
      cwd: "./service/staff",
      node_args: "--env-file=.env --enable-source-maps",
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
      cwd: "./service/agent-invoice",
      node_args: "--env-file=.env --enable-source-maps",
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
