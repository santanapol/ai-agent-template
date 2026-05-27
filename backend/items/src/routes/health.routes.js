import { Router } from 'express';
import { getDatabase } from '../config/database.js';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/readyz', async (_req, res) => {
  try {
    await getDatabase().command({ ping: 1 });
    return res.status(200).json({ status: 'ready' });
  } catch {
    return res.status(503).json({ status: 'not_ready' });
  }
});

export default router;
