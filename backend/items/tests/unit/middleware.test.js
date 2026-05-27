import request from 'supertest';
import express from 'express';
import { authMiddleware } from '../../src/middlewares/auth.middleware.js';
import { userContextMiddleware } from '../../src/middlewares/user-context.middleware.js';
import { requestIdMiddleware } from '../../src/middlewares/request-id.middleware.js';
import { validateBody } from '../../src/middlewares/validate.middleware.js';
import { errorMiddleware } from '../../src/middlewares/error.middleware.js';
import { createItemSchema } from '../../src/validators/items.validator.js';
import { sendSuccess } from '../../src/utils/response.js';
import { validHeaders } from '../helpers/headers.js';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(authMiddleware);
  app.use(userContextMiddleware);
  app.post('/api/v1/items', validateBody(createItemSchema), (req, res) => {
    sendSuccess(res, {
      status: 201,
      code: 'CREATED',
      message: 'Item created successfully',
      data: { name: req.body.name },
    });
  });
  app.use(errorMiddleware);
  return app;
}

describe('Middleware stack', () => {
  const app = buildTestApp();

  it('rejects missing gateway secret with 401', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders({ 'x-gateway-secret': '' }))
      .send({ name: 'Widget A' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('GATEWAY_SECRET_REJECTED');
  });

  it('rejects missing user context with 403', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .unset('x-user-ou')
      .send({ name: 'Widget A' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MISSING_GATEWAY_USER_CONTEXT');
  });

  it('rejects duplicate critical headers with 400', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .set('x-user-ou', '665a1b2c3d4e5f6789012345,665a1b2c3d4e5f6789012347')
      .send({ name: 'Widget A' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_HEADER');
  });

  it('rejects invalid body with 400', async () => {
    const res = await request(app).post('/api/v1/items').set(validHeaders()).send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PARAM');
  });

  it('passes valid request through middleware chain', async () => {
    const res = await request(app)
      .post('/api/v1/items')
      .set(validHeaders())
      .send({ name: 'Widget A', desc: 'A widget' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('CREATED');
    expect(res.body.data.name).toBe('Widget A');
  });
});
