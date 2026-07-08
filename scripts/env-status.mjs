#!/usr/bin/env node
/**
 * Show which env files exist and which workflow they belong to.
 * Usage: node scripts/env-status.mjs [--offset=0]
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

const offsetArg = process.argv.find((a) => a.startsWith('--offset='));
const offset = offsetArg ? Number(offsetArg.split('=')[1]) : Number(process.env.PORT_OFFSET ?? 0);

const SERVICES = [
  { label: 'auth', dir: 'auth' },
  { label: 'gateway', dir: 'gateway' },
  { label: 'staff', dir: 'service/staff' },
  { label: 'demo-service', dir: 'service/demo-service' },
  { label: 'agent-invoice', dir: 'service/agent-invoice' },
  { label: 'smart-report', dir: 'service/smart-report' },
  { label: 'branch-report', dir: 'service/branch-report' },
];

function mark(filePath) {
  return existsSync(filePath) ? '✓' : '·';
}

function line(label, checks) {
  const cols = checks.map((c) => (c ? '✓' : '·')).join(' ');
  console.log(`  ${label.padEnd(16)} ${cols}`);
}

function harnessPath(dir) {
  if (offset === 0) {
    return path.join(BACKEND, dir, '.env.harness');
  }
  const name = path.basename(dir);
  return path.join(ROOT, '.dev-run', String(offset), 'harness', `${name}.env.harness`);
}

console.log('Environment file status\n');
console.log('Guide: backend/ENV.md\n');

console.log('Backend services (example / harness.ex / harness / manual / prod / staging / test):');
console.log('  service          ex  hex  har  .env prod stg test');
for (const { label, dir } of SERVICES) {
  const base = path.join(BACKEND, dir);
  line(label, [
    existsSync(path.join(base, '.env.example')),
    existsSync(path.join(base, '.env.harness.example')),
    existsSync(harnessPath(dir)),
    existsSync(path.join(base, '.env')),
    existsSync(path.join(base, '.env.prod')),
    existsSync(path.join(base, '.env.staging')),
    existsSync(path.join(base, '.env.test')),
  ]);
}


console.log(`\nHarness runtime (PORT_OFFSET=${offset}):`);
console.log(`  .dev-run/${offset}/logs/ + pids/  ${existsSync(path.join(ROOT, '.dev-run', String(offset), 'logs')) ? '✓' : '·'}`);
if (offset !== 0) {
  const isoDir = path.join(ROOT, '.dev-run', String(offset), 'harness');
  console.log(`  .dev-run/${offset}/harness/   ${existsSync(isoDir) ? '✓' : '·'}`);
}

const feHarness = path.join(ROOT, 'frontend/backoffice-next/.env.harness');
const feLocal = path.join(ROOT, 'frontend/backoffice-next/.env.local');
console.log('\nFrontend backoffice-next:');
console.log(`  .env.harness.example  ${mark(path.join(ROOT, 'frontend/backoffice-next/.env.harness.example'))}`);
console.log(`  .env.harness          ${mark(feHarness)}`);
console.log(`  .env.local            ${mark(feLocal)}`);

console.log('\nRecommended (solo dev):');
console.log('  • ./scripts/dev-up.sh — edit backend/*/.env.harness for Atlas');
console.log('  • Ignore backend/*/.env unless manual npm run dev');
