import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'

const COLLECTIONS = ['users', 'refresh_tokens', 'credential_throttle', 'audit_events']

/**
 * In-memory MongoDB as a **single-node replica set** so `withTransaction` works (same as production Atlas).
 * Override with `TEST_DATABASE_URI` (must be a replica-set URI if the app uses transactions).
 * @returns {Promise<{ databaseUri: string, stop: () => Promise<void> }>}
 */
export async function startMongoForTests () {
  const existing = process.env.TEST_DATABASE_URI?.trim()
  if (existing) {
    return {
      databaseUri: existing,
      stop: async () => {}
    }
  }
  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      name: 'rs0',
      count: 1,
      dbName: 'auth_integration_test'
    }
  })
  return {
    databaseUri: replSet.getUri(),
    stop: () => replSet.stop()
  }
}

/**
 * Clears auth-related collections (does not drop the whole database).
 * @param {string} databaseUri
 */
export async function resetDatabase (databaseUri) {
  const client = new MongoClient(databaseUri)
  await client.connect()
  const db = client.db()
  for (const name of COLLECTIONS) {
    await db.collection(name).deleteMany({})
  }
  await client.close()
}
