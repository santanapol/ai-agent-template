import { MongoClient } from 'mongodb'

/**
 * Read-only MongoDB connection for branch master (`su_branch` in `gpp_777ww`).
 * Uses `readPreference: secondaryPreferred` when a replica set is available.
 */
export class BranchReadDb {
  /**
   * @param {{ uri: string, dbName: string }} opts
   */
  constructor({ uri, dbName }) {
    this.uri = uri
    this.dbName = dbName
    /** @type {import('mongodb').MongoClient | null} */
    this.client = null
    /** @type {import('mongodb').Db | null} */
    this.db = null
  }

  async connect() {
    if (this.client) return
    this.client = new MongoClient(this.uri, {
      readPreference: 'secondaryPreferred',
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000
    })
    await this.client.connect()
    this.db = this.client.db(this.dbName)
  }

  /** @returns {import('mongodb').Db} */
  getDb() {
    if (!this.db) throw new Error('BranchReadDb not connected')
    return this.db
  }

  async ping() {
    await this.connect()
    await this.getDb().command({ ping: 1 })
  }

  async close() {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.db = null
    }
  }
}
