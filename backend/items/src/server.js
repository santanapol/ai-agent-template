import dotenv from 'dotenv';
import { createApp, logger } from './app.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import { ensureItemIndexes } from './models/items.model.js';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export async function startServer() {
  await connectDatabase();
  await ensureItemIndexes();

  const port = Number(process.env.PORT ?? 3000);
  const app = createApp();

  return app.listen(port, () => {
    logger.info({ port }, 'items-service started');
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.error({ err: error }, 'Failed to start items-service');
    process.exit(1);
  });
}

export { closeDatabase };
