import fp from 'fastify-plugin';
import { connectDatabase, closeDatabase } from '../config/database.js';

async function dbPlugin(fastify) {
  const { db, sourceDb } = await connectDatabase();

  fastify.decorate('db', db);
  if (sourceDb) {
    fastify.decorate('sourceDb', sourceDb);
  }

  fastify.addHook('onClose', async () => {
    await closeDatabase();
  });

  fastify.log.info('Connected to MongoDB');
}

export default fp(dbPlugin, { name: 'db-plugin' });
