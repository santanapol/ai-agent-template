import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

const { createEcosystemConfig, APPS } = require(
  path.join(backendRoot, 'ecosystem.factory.js'),
);

describe('ecosystem.factory', () => {
  it('staging config uses .env.staging and APP_ENV=staging', () => {
    const config = createEcosystemConfig('.env.staging', {
      appEnv: 'staging',
    });
    assert.equal(config.apps.length, APPS.length);
    for (const app of config.apps) {
      assert.match(app.node_args, /--env-file=.*\.env\.staging/);
      assert.equal(app.env.APP_ENV, 'staging');
      assert.equal(app.env.NODE_ENV, 'production');
    }
  });

  it('production config uses .env.prod', () => {
    const config = createEcosystemConfig('.env.prod');
    for (const app of config.apps) {
      assert.match(app.node_args, /--env-file=.*\.env\.prod/);
      assert.equal(app.env.NODE_ENV, 'production');
      assert.equal(app.env.APP_ENV, undefined);
    }
  });

  it('includes all six PM2 apps', () => {
    const names = APPS.map((a) => a.name).sort();
    assert.deepEqual(names, [
      'zero-agent-invoice',
      'zero-auth',
      'zero-branch-report',
      'zero-gateway',
      'zero-smart-report',
      'zero-staff',
    ]);
  });
});
