import fp from 'fastify-plugin';
import { MongoClient } from 'mongodb';

async function dbPlugin(fastify, options) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zero_platform';
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    
    fastify.decorate('db', db);
    fastify.decorate('mongoClient', client);

    fastify.addHook('onClose', async (instance) => {
      await instance.mongoClient.close();
    });

    fastify.log.info('Connected to MongoDB');
  } catch (error) {
    fastify.log.error('Failed to connect to MongoDB');
    throw error;
  }
}

export default fp(dbPlugin, { name: 'db-plugin' });
