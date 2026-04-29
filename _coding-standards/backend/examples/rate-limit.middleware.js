'use strict';

/**
 * Rate limit middleware per api.md → Rate limiting → Implementation contract.
 *
 * - Key priority: x-user-id → sha256(x-gateway-secret) → req.ip
 * - Store: ENV RATE_LIMIT_STORE (memory | redis); multi-replica ต้องเป็น redis
 * - Headers: standardHeaders=true, legacyHeaders=false, Retry-After on 429
 * - Tier: GET/HEAD = read; อื่นๆ = write; per-route override อ่านจาก OpenAPI x-ratelimit
 */

const crypto = require('node:crypto');
const rateLimit = require('express-rate-limit');

const APP_NAME = process.env.APP_NAME || 'service';

function buildKey(req) {
  const userId = req.headers['x-user-id'];
  if (userId) return `u:${userId}`;
  const secret = req.headers['x-gateway-secret'];
  if (secret) return `s:${crypto.createHash('sha256').update(secret).digest('hex').slice(0, 16)}`;
  return `ip:${req.ip}`;
}

function buildStore() {
  const mode = process.env.RATE_LIMIT_STORE || 'memory';
  if (mode === 'memory') return undefined;
  if (mode === 'redis') {
    const RedisStore = require('rate-limit-redis');
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    client.connect().catch((err) => {
      console.error('redis connect failed', err);
      process.exit(1);
    });
    return new RedisStore({
      sendCommand: (...args) => client.sendCommand(args),
      prefix: `rl:${APP_NAME}:`,
    });
  }
  throw new Error(`unknown RATE_LIMIT_STORE: ${mode}`);
}

function makeLimiter({ windowMs, max, reason }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildKey,
    store: buildStore(),
    handler: (req, res) => {
      res.set('Retry-After', Math.ceil(windowMs / 1000));
      res.status(429).json({
        success: false,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
        data: null,
        requestId: req.id,
      });
    },
  });
}

const readLimiter = makeLimiter({
  windowMs: Number(process.env.RATE_LIMIT_READ_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_READ_MAX || 600),
});

const writeLimiter = makeLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WRITE_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_WRITE_MAX || 200),
});

function defaultLimiter(req, res, next) {
  const limiter = req.method === 'GET' || req.method === 'HEAD' ? readLimiter : writeLimiter;
  return limiter(req, res, next);
}

module.exports = { defaultLimiter, makeLimiter, buildKey };
