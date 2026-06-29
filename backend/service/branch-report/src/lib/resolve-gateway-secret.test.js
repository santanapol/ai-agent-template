import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { resolveGatewaySecret } from './resolve-gateway-secret.js';

describe('resolveGatewaySecret', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers options.gatewaySecret', () => {
    assert.equal(
      resolveGatewaySecret({ gatewaySecret: 'from-options' }),
      'from-options',
    );
  });

  it('reads GATEWAY_SECRET from env', () => {
    process.env.GATEWAY_SECRET = ' from-env ';
    assert.equal(resolveGatewaySecret(), 'from-env');
  });

  it('falls back to test secret only in NODE_ENV=test', () => {
    delete process.env.GATEWAY_SECRET;
    process.env.NODE_ENV = 'test';
    assert.equal(resolveGatewaySecret(), 'test-gateway-secret');
  });

  it('throws when secret is missing outside test env', () => {
    delete process.env.GATEWAY_SECRET;
    process.env.NODE_ENV = 'development';

    assert.throws(
      () => resolveGatewaySecret(),
      /GATEWAY_SECRET is required/,
    );
  });
});
