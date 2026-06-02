import Fastify from 'fastify';
import dbPlugin from './plugins/db.plugin.js';
import agentFeesRoute from './modules/agent-fees/agent-fees.route.js';

export default async function buildApp(opts = {}) {
  const app = Fastify({
    logger: true,
    ...opts
  });

  // Register Plugins
  await app.register(dbPlugin);

  // Register Routes
  await app.register(agentFeesRoute, { prefix: '/api/v1/agents' });

  return app;
}
