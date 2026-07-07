import { buildApp } from './app.js';
import { closeDatabase, connectDatabase } from './config/database.js';

const port = Number(process.env.PORT ?? 3104);
const host = process.env.HOST ?? '0.0.0.0';

const app = await buildApp();

try {
  await connectDatabase();
  await app.listen({ port, host });
  app.log.info(`branch-report listening on ${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown(signal) {
  app.log.info(`Received ${signal}, shutting down`);
  await app.close();
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
