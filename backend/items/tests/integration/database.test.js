import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, closeDatabase, getDatabase } from '../../src/config/database.js';
import { COLLECTION_NAME, ensureItemIndexes } from '../../src/models/items.model.js';

const hasMongo = Boolean(process.env.MONGODB_URI && process.env.DB_NAME);

const describeIfMongo = hasMongo ? describe : describe.skip;

describeIfMongo('Database integration', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase();
    await ensureItemIndexes();
  });

  afterAll(async () => {
    const db = getDatabase();
    await db.collection(COLLECTION_NAME).deleteMany({});
    await closeDatabase();
  });

  it('connects to MongoDB and creates unique index', async () => {
    const db = getDatabase();
    const indexes = await db.collection(COLLECTION_NAME).indexes();

    const uniqueIndex = indexes.find((index) => index.name === 'uniq_ou_branch_name');
    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex.unique).toBe(true);
  });

  it('GET /readyz returns 200 when database is reachable', async () => {
    const res = await request(app).get('/readyz');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });
});
