import express from 'express';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { userContextMiddleware } from './middlewares/user-context.middleware.js';
import healthRoutes from './routes/health.routes.js';
import itemsRoutes from './routes/items.routes.js';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-gateway-secret"]'],
    }),
  );

  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(healthRoutes);

  const apiRouter = express.Router();
  apiRouter.use(authMiddleware);
  apiRouter.use(userContextMiddleware);
  apiRouter.use(itemsRoutes);
  app.use('/api/v1', apiRouter);

  app.use(errorMiddleware);

  return app;
}

export { logger };
