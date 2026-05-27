import request from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDatabase, closeDatabase, getDatabase } from '../../src/config/database.js';
import { COLLECTION_NAME, ensureItemIndexes } from '../../src/models/items.model.js';
import { validHeaders } from '../helpers/headers.js';

const hasMongo = Boolean(process.env.MONGODB_URI && process.env.DB_NAME);
const describeIfMongo = hasMongo ? describe : describe.skip;

describe('POST /api/v1/items — request validation and auth', () => {
  const app = createApp();

  it('returns 401 when gateway secret is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders({ 'x-gateway-secret': 'wrong-secret' }))
      .send({ name: 'Widget A' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('GATEWAY_SECRET_REJECTED');
    expect(res.body.data).toBeNull();
  });

  it('returns 403 when tenant headers are missing', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .unset('x-user-ou')
      .send({ name: 'Widget A' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MISSING_GATEWAY_USER_CONTEXT');
  });

  it('returns 403 when tenant OU is not a valid ObjectId', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders({ 'x-user-ou': 'invalid-id' }))
      .send({ name: 'Widget A' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MISSING_GATEWAY_USER_CONTEXT');
  });

  it('returns 400 when name is empty', async () => {
    const res = await request(app).post('/api/v1/items').set(validHeaders()).send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PARAM');
  });

  it('returns 400 when desc exceeds 2000 characters', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .send({ name: 'Widget A', desc: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PARAM');
  });
});

describeIfMongo('POST /api/v1/items — database flows', () => {
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

  beforeEach(async () => {
    const db = getDatabase();
    await db.collection(COLLECTION_NAME).deleteMany({});
  });

  it('creates item and returns 201 CREATED with ETag', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .send({ name: 'Widget A', desc: 'A useful widget' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.code).toBe('CREATED');
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Widget A');
    expect(res.body.data.desc).toBe('A useful widget');
    expect(res.body.data.cr_by).toBe('user-001');
    expect(res.headers.etag).toMatch(/^W\/"/);

    const db = getDatabase();
    const saved = await db.collection(COLLECTION_NAME).findOne({ name: 'Widget A' });
    expect(saved).toBeTruthy();
    expect(saved.ou_id.toString()).toBe('665a1b2c3d4e5f6789012345');
    expect(saved.branch_id.toString()).toBe('665a1b2c3d4e5f6789012346');
  });

  it('returns 409 when name duplicates within the same OU and branch', async () => {
    await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .send({ name: 'Widget A' });

    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .send({ name: 'Widget A' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE');
    expect(res.body.data).toBeNull();
  });
});
