module.exports = {
  apps: [
    {
      name: "reference",
      script: "src/server.js",
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        TZ: "UTC",
        PORT: 3003,
      },
    },
  ],
};
