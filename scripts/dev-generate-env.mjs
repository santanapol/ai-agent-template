#!/usr/bin/env node
/**
 * Generate / refresh `.env.harness` for harness dev stack.
 * Usage: node scripts/dev-generate-env.mjs <runDir> <portOffset>
 *
 * PORT_OFFSET=0 → writes `backend/<service>/.env.harness` (and frontend backoffice)
 * PORT_OFFSET≠0 → writes `<runDir>/harness/<service>.env.harness` (isolated instance)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

const runDir = process.argv[2];
const offset = Number(process.argv[3] ?? 0);

if (!runDir || Number.isNaN(offset)) {
  console.error('Usage: node scripts/dev-generate-env.mjs <runDir> <portOffset>');
  process.exit(1);
}

const ports = {
  gateway: 3000 + offset,
  auth: 3001 + offset,
  demo: 3002 + offset,
  staff: 3101 + offset,
  invoice: 3102 + offset,
  smartReport: 3103 + offset,
  branchReport: 3104 + offset,
  backoffice: 5175 + offset,
};

const redisDb = offset % 16;
const mongoAuthDb = `auth_login_${offset}`;
const mongoDemoDb = `demo_service_${offset}`;
const mongoSmartReportDb = `smart_report_${offset}`;
const gatewaySecret = 'test-gateway-secret-32-chars-minimum!!';
const harnessDevPassword = '1234';

/** Keys refreshed on every dev-up (ports, local DB names, routes). User Atlas URIs are kept. */
const DYNAMIC_KEYS = new Set([
  'PORT',
  'LOG_PRETTY',
  'DATABASE_URI',
  'MONGODB_URI',
  'DB_NAME',
  'REDIS_URL',
  'JWKS_PUBLIC_URL',
  'JWT_ISSUER',
  'PROBLEM_TYPE_BASE',
  'JWT_JWKS_URL',
  'ROUTES_JSON',
  'GATEWAY_SECRET',
  'GATEWAY_SHARED_SECRET',
  'AUTH_INTERNAL_BASE_URL',
  'AUTH_INTERNAL_SERVICE_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'EXAMPLE_ADMIN_PASSWORD',
  'EXAMPLE_BRANCH_ADMIN_PASSWORD',
  'EXAMPLE_SUPPORT_ADMIN_PASSWORD',
  'EXAMPLE_SUPPORT_PASSWORD',
  'EXAMPLE_STAFF_PASSWORD',
  'METRICS_ENABLED',
  'BACKOFFICE_PORT',
  'AUTH_PROXY_TARGET',
  'GATEWAY_PROXY_TARGET',
]);

function harnessOutPath(serviceRel, harnessName) {
  if (offset === 0) {
    if (serviceRel.startsWith('frontend/')) {
      return path.join(ROOT, serviceRel, '.env.harness');
    }
    return path.join(BACKEND, serviceRel, '.env.harness');
  }
  const harnessDir = path.join(runDir, 'harness');
  mkdirSync(harnessDir, { recursive: true });
  return path.join(harnessDir, harnessName);
}

function parseEnvValues(content) {
  const map = new Map();
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function applyPatches(content, patches) {
  let out = content;
  for (const [key, value] of Object.entries(patches)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(out)) out = out.replace(re, `${key}=${value}`);
    else out = `${out.trimEnd()}\n${key}=${value}\n`;
  }
  return out;
}

function mergeHarness(existingContent, patchedContent) {
  if (!existingContent) return patchedContent;
  const existing = parseEnvValues(existingContent);
  const patched = parseEnvValues(patchedContent);
  const toApply = {};
  for (const [key, value] of patched) {
    if (DYNAMIC_KEYS.has(key) || !existing.has(key)) {
      toApply[key] = value;
    }
  }
  let merged = existingContent;
  for (const [key, value] of Object.entries(toApply)) {
    merged = applyPatches(merged, { [key]: value });
  }
  return merged;
}

function patchHarnessExample(serviceRel, patches, harnessName) {
  const examplePath = path.join(BACKEND, serviceRel, '.env.harness.example');
  const fallback = path.join(BACKEND, serviceRel, '.env.example');
  const example = existsSync(examplePath) ? examplePath : fallback;
  if (!existsSync(example)) {
    throw new Error(`Missing ${examplePath} (or ${fallback})`);
  }

  let content = readFileSync(example, 'utf8');
  content = applyPatches(content, patches);

  const outPath = harnessOutPath(serviceRel, `${harnessName}.env.harness`);
  const existing = existsSync(outPath) ? readFileSync(outPath, 'utf8') : null;
  content = mergeHarness(existing, content);
  writeFileSync(outPath, content, { mode: 0o600 });
  return outPath;
}

function ensureAuthJwt(envPath) {
  let content = readFileSync(envPath, 'utf8');
  if (/^JWT_PRIVATE_KEY_PEM=\s*$/m.test(content) || /^JWT_PRIVATE_KEY_PEM=$/m.test(content)) {
    const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    });
    const escaped = String(pem).trim().split('\n').join('\\n');
    content = content.replace(/^JWT_PRIVATE_KEY_PEM=.*$/m, `JWT_PRIVATE_KEY_PEM=${escaped}`);
    writeFileSync(envPath, content, { mode: 0o600 });
  }
}

const authBase = `http://127.0.0.1:${ports.auth}`;

const authPath = patchHarnessExample('auth', {
  PORT: ports.auth,
  LOG_PRETTY: 'false',
  DATABASE_URI: `mongodb://127.0.0.1:27017/${mongoAuthDb}`,
  REDIS_URL: `redis://127.0.0.1:6379/${redisDb}`,
  JWKS_PUBLIC_URL: `${authBase}/.well-known/jwks.json`,
  JWT_ISSUER: authBase,
  PROBLEM_TYPE_BASE: `${authBase}/problems`,
  AUTH_INTERNAL_SERVICE_SECRET: 'staff-internal-secret-32-chars-min!!',
  ADMIN_USERNAME: 'platform_admin',
  ADMIN_PASSWORD: harnessDevPassword,
  EXAMPLE_ADMIN_PASSWORD: harnessDevPassword,
  EXAMPLE_BRANCH_ADMIN_PASSWORD: harnessDevPassword,
  EXAMPLE_SUPPORT_ADMIN_PASSWORD: harnessDevPassword,
  EXAMPLE_SUPPORT_PASSWORD: harnessDevPassword,
  EXAMPLE_STAFF_PASSWORD: harnessDevPassword,
}, 'auth');
ensureAuthJwt(authPath);

patchHarnessExample('gateway', {
  PORT: ports.gateway,
  LOG_PRETTY: 'false',
  JWT_JWKS_URL: `${authBase}/.well-known/jwks.json`,
  JWT_ISSUER: authBase,
  REDIS_URL: `redis://127.0.0.1:6379/${redisDb}`,
  GATEWAY_SECRET: gatewaySecret,
  ROUTES_JSON: JSON.stringify([
    { prefix: '/api/v1/staff', upstream: `http://127.0.0.1:${ports.staff}`, stripPrefix: false },
    { prefix: '/api/v1/items', upstream: `http://127.0.0.1:${ports.demo}`, stripPrefix: false },
    { prefix: '/api/v1/me', upstream: `http://127.0.0.1:${ports.demo}`, stripPrefix: false },
    { prefix: '/api/v1/agent-invoice', upstream: `http://127.0.0.1:${ports.invoice}`, stripPrefix: false },
    { prefix: '/api/v1/invoices', upstream: `http://127.0.0.1:${ports.invoice}`, stripPrefix: false },
    { prefix: '/api/v1/smart-reports', upstream: `http://127.0.0.1:${ports.smartReport}`, stripPrefix: false },
    { prefix: '/api/v1/branch-report', upstream: `http://127.0.0.1:${ports.branchReport}`, stripPrefix: false },
    { prefix: '/auth', upstream: authBase, stripPrefix: false, isPublic: true },
  ]),
}, 'gateway');

patchHarnessExample('service/demo-service', {
  PORT: ports.demo,
  GATEWAY_SHARED_SECRET: gatewaySecret,
  MONGODB_URI: `mongodb://127.0.0.1:27017/${mongoDemoDb}`,
  DB_NAME: mongoDemoDb,
}, 'demo-service');

patchHarnessExample('service/staff', {
  PORT: ports.staff,
  GATEWAY_SHARED_SECRET: gatewaySecret,
  MONGODB_URI: `mongodb://127.0.0.1:27017/${mongoAuthDb}`,
  DB_NAME: mongoAuthDb,
  AUTH_INTERNAL_BASE_URL: authBase,
  AUTH_INTERNAL_SERVICE_SECRET: 'staff-internal-secret-32-chars-min!!',
  METRICS_ENABLED: 'true',
  LOG_PRETTY: 'false',
}, 'staff');

patchHarnessExample('service/agent-invoice', {
  PORT: ports.invoice,
  GATEWAY_SHARED_SECRET: gatewaySecret,
  MONGODB_URI: `mongodb://127.0.0.1:27017/${mongoAuthDb}`,
  DB_NAME: `agent_invoice_${offset}`,
  MONGODB_URI_READ: `mongodb://127.0.0.1:27017/${mongoAuthDb}`,
  MONGODB_DB_BRANCH: 'gpp_777ww',
  MONGODB_DB_ORG_DATA: 'gpp_org_data',
}, 'agent-invoice');

patchHarnessExample('service/smart-report', {
  PORT: ports.smartReport,
  GATEWAY_SHARED_SECRET: gatewaySecret,
  MONGODB_URI: `mongodb://127.0.0.1:27017/${mongoSmartReportDb}`,
  DB_NAME: mongoSmartReportDb,
  MONGODB_URI_READ: `mongodb://127.0.0.1:27017/${mongoSmartReportDb}`,
}, 'smart-report');

patchHarnessExample('service/branch-report', {
  PORT: ports.branchReport,
  GATEWAY_SHARED_SECRET: gatewaySecret,
  MONGODB_URI_READ: 'mongodb://127.0.0.1:27017',
  MONGODB_DB_BRANCH: 'gpp_777ww',
}, 'branch-report');

const backofficePath = harnessOutPath('frontend/backoffice', 'backoffice.env.harness');
const backofficeContent = `# Generated / refreshed by dev-generate-env.mjs
BACKOFFICE_PORT=${ports.backoffice}
AUTH_PROXY_TARGET=${authBase}
GATEWAY_PROXY_TARGET=http://127.0.0.1:${ports.gateway}
`;
writeFileSync(backofficePath, backofficeContent, { mode: 0o600 });

const harnessLabel = offset === 0 ? 'backend/*/ & frontend/backoffice/.env.harness' : `${runDir}/harness/*.env.harness`;
console.log(`Refreshed harness env → ${harnessLabel} (offset=${offset})`);
