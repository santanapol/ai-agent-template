import fp from 'fastify-plugin'
import { MongoClient } from 'mongodb'

async function mongoPlugin(fastify, opts) {
  const client = new MongoClient(opts.uri)
  await client.connect()
  fastify.decorate('mongo', { client, db: client.db() })
  fastify.addHook('onClose', async () => {
    await client.close()
  })
}

export default fp(mongoPlugin, { name: 'mongo' })
