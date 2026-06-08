import fp from 'fastify-plugin';
import { connectDatabase, closeDatabase } from '../config/database.js';

async function dbPlugin(fastify) {
  const { db } = await connectDatabase();

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await closeDatabase();
  });

  fastify.log.info('Connected to MongoDB');
}

export default fp(dbPlugin, { name: 'db-plugin' });
