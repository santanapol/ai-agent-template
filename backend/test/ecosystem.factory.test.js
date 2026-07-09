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
    assert.equal(config.apps.length, APPS.length + 1);
    const backendApps = config.apps.filter((a) => a.name !== 'zero-backoffice');
    assert.equal(backendApps.length, APPS.length);
    for (const app of backendApps) {
      assert.match(app.node_args, /--env-file=.*\.env\.staging/);
      assert.equal(app.env.APP_ENV, 'staging');
      assert.equal(app.env.NODE_ENV, 'production');
    }
    const front = config.apps.find((a) => a.name === 'zero-backoffice');
    assert.ok(front);
    assert.equal(front.env.PORT, '3005');
  });

  it('production config uses .env.prod', () => {
    const config = createEcosystemConfig('.env.prod');
    const backendApps = config.apps.filter((a) => a.name !== 'zero-backoffice');
    for (const app of backendApps) {
      assert.match(app.node_args, /--env-file=.*\.env\.prod/);
      assert.equal(app.env.NODE_ENV, 'production');
      assert.equal(app.env.APP_ENV, undefined);
    }
  });

  it('includes all six backend PM2 apps plus zero-backoffice', () => {
    const config = createEcosystemConfig('.env.prod');
    const names = config.apps.map((a) => a.name).sort();
    assert.deepEqual(names, [
      'zero-agent-invoice',
      'zero-auth',
      'zero-backoffice',
      'zero-branch-report',
      'zero-gateway',
      'zero-smart-report',
      'zero-staff',
    ]);
  });

  it('production small profile caps memory per process', () => {
    const config = createEcosystemConfig('.env.prod', {
      appEnv: 'production',
      memoryProfile: 'small',
    });
    const auth = config.apps.find((a) => a.name === 'zero-auth');
    const gateway = config.apps.find((a) => a.name === 'zero-gateway');
    const front = config.apps.find((a) => a.name === 'zero-backoffice');

    assert.equal(auth.max_memory_restart, '200M');
    assert.match(auth.env.NODE_OPTIONS, /--max-old-space-size=144/);
    assert.equal(gateway.max_memory_restart, '140M');
    assert.equal(front.max_memory_restart, '380M');
    assert.match(front.env.NODE_OPTIONS, /--max-old-space-size=300/);
  });

  it('staging small-with-deps profile is tighter than production small', () => {
    const prod = createEcosystemConfig('.env.prod', { memoryProfile: 'small' });
    const staging = createEcosystemConfig('.env.staging', {
      appEnv: 'staging',
      memoryProfile: 'small-with-deps',
    });

    const prodAuth = prod.apps.find((a) => a.name === 'zero-auth');
    const stagingAuth = staging.apps.find((a) => a.name === 'zero-auth');
    assert.equal(prodAuth.max_memory_restart, '200M');
    assert.equal(stagingAuth.max_memory_restart, '160M');
  });

  it('ecosystem.config.js wires production small profile', () => {
    const prodConfig = require(path.join(backendRoot, 'ecosystem.config.js'));
    const auth = prodConfig.apps.find((a) => a.name === 'zero-auth');
    assert.equal(auth.max_memory_restart, '200M');
    assert.equal(auth.env.APP_ENV, 'production');
  });
});
