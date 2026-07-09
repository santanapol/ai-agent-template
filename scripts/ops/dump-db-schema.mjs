#!/usr/bin/env node
/**
 * Read-only MongoDB schema dump → docs/audit/prod-schema-baseline-*.md + .json
 *
 * Usage (on prod server or machine with .env.prod):
 *   node scripts/ops/dump-db-schema.mjs --env-file=backend/auth/.env.prod --out docs/audit
 *   node scripts/ops/dump-db-schema.mjs --all-prod --out docs/audit
 *
 * Options:
 *   --env-file=<path>   Single service env (DATABASE_URI or MONGODB_URI+DB_NAME)
 *   --all-prod          Dump zero-platform (auth), zero-agent-invoice, zero-smart-report
 *   --out=<dir>         Output directory (default: docs/audit)
 *   --date=YYYY-MM-DD   Baseline date suffix (default: today UTC)
 *   --prod-git-commit=<sha>  Record deploy commit (default: unknown)
 *   --dumped-by=<name>  Who ran the dump
 *   --environment=<label>  default: production
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.join(ROOT, 'backend/auth/package.json'));
const { MongoClient } = require('mongodb');

const PROD_TARGETS = [
  {
    label: 'auth-staff',
    envFile: 'backend/auth/.env.prod',
    resolveUri: (env) => env.DATABASE_URI,
    resolveDbName: (uri) => {
      try {
        return new URL(uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'))
          .pathname
          .replace(/^\//, '')
          .split('?')[0];
      } catch {
        return null;
      }
    },
  },
  {
    label: 'agent-invoice',
    envFile: 'backend/service/agent-invoice/.env.prod',
    resolveUri: (env) => env.MONGODB_URI,
    resolveDbName: (env) => env.DB_NAME,
  },
  {
    label: 'smart-report',
    envFile: 'backend/service/smart-report/.env.prod',
    resolveUri: (env) => env.MONGODB_URI,
    resolveDbName: (env) => env.DB_NAME,
  },
];

function parseArgs(argv) {
  const out = {
    envFile: null,
    allProd: false,
    outDir: path.join(ROOT, 'docs/audit'),
    date: new Date().toISOString().slice(0, 10),
    prodGitCommit: process.env.PROD_GIT_COMMIT ?? 'unknown',
    dumpedBy: process.env.DUMPED_BY ?? 'unknown',
    environment: 'production',
  };
  for (const arg of argv) {
    if (arg === '--all-prod') out.allProd = true;
    else if (arg.startsWith('--env-file=')) out.envFile = arg.slice('--env-file='.length);
    else if (arg.startsWith('--out=')) out.outDir = path.isAbsolute(arg.slice(6)) ? arg.slice(6) : path.join(ROOT, arg.slice(6));
    else if (arg.startsWith('--date=')) out.date = arg.slice('--date='.length);
    else if (arg.startsWith('--prod-git-commit=')) out.prodGitCommit = arg.slice('--prod-git-commit='.length);
    else if (arg.startsWith('--dumped-by=')) out.dumpedBy = arg.slice('--dumped-by='.length);
    else if (arg.startsWith('--environment=')) out.environment = arg.slice('--environment='.length);
  }
  return out;
}

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** @param {string} uri */
function redactUri(uri) {
  if (!uri) return '<redacted>';
  try {
    const normalized = uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://');
    const u = new URL(normalized);
    const host = u.hostname ? `<prod-host>${u.port ? `:${u.port}` : ''}` : '<prod-host>';
    const db = u.pathname.replace(/^\//, '').split('?')[0];
    const qs = u.search ? u.search : '';
    return `mongodb://${host}/${db}${qs}`;
  } catch {
    return '<redacted-uri>';
  }
}

/**
 * @param {import('mongodb').IndexDescription[]} indexes
 */
function serializeIndexes(indexes) {
  return indexes.map((idx) => ({
    name: idx.name,
    key: idx.key,
    unique: Boolean(idx.unique),
    expireAfterSeconds: idx.expireAfterSeconds ?? null,
    sparse: Boolean(idx.sparse),
    partialFilterExpression: idx.partialFilterExpression ?? null,
  }));
}

/**
 * @param {import('mongodb').Db} db
 */
async function dumpDatabase(db, redactedUri) {
  const collections = [];
  const listed = await db.listCollections({}, { nameOnly: false }).toArray();
  for (const info of listed.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = info.name;
    const col = db.collection(name);
    const indexes = await col.indexes();
    const options = info.options ?? {};
    const entry = {
      name,
      indexes: serializeIndexes(indexes),
    };
    if (options.validator) {
      entry.validator = options.validator;
      entry.validationLevel = options.validationLevel ?? null;
      entry.validationAction = options.validationAction ?? null;
    }
    collections.push(entry);
  }
  return {
    database: db.databaseName,
    uri_redacted: redactedUri,
    collections,
  };
}

/**
 * @param {object} payload
 */
function toMarkdown(payload) {
  const lines = [
    '# Production schema baseline',
    '',
    '| Field | Value |',
    '|-------|-------|',
    `| dumped_at | ${payload.metadata.dumped_at} |`,
    `| environment | ${payload.metadata.environment} |`,
    `| prod_git_commit | ${payload.metadata.prod_git_commit} |`,
    `| dumped_by | ${payload.metadata.dumped_by} |`,
    `| databases | ${payload.databases.map((d) => d.database).join(', ')} |`,
    '',
    '> Read-only dump — no documents. URI hosts redacted.',
    '',
  ];
  for (const db of payload.databases) {
    lines.push(`## Database: \`${db.database}\``);
    lines.push('');
    lines.push(`URI: \`${db.uri_redacted}\``);
    lines.push('');
    for (const coll of db.collections) {
      lines.push(`### ${coll.name}`);
      lines.push('');
      if (coll.validator) {
        lines.push('**Validator:**');
        lines.push('```json');
        lines.push(JSON.stringify(coll.validator, null, 2));
        lines.push('```');
        if (coll.validationLevel) lines.push(`validationLevel: \`${coll.validationLevel}\``);
        lines.push('');
      }
      lines.push('**Indexes:**');
      for (const idx of coll.indexes) {
        const flags = [
          idx.unique ? 'unique' : null,
          idx.expireAfterSeconds != null ? `TTL expireAfterSeconds=${idx.expireAfterSeconds}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        lines.push(
          `- \`${idx.name}\`: \`${JSON.stringify(idx.key)}\`${flags ? ` (${flags})` : ''}`,
        );
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

/**
 * @param {string} envPath
 * @param {(env: Record<string, string>) => string | undefined} resolveUri
 * @param {(env: Record<string, string>, uri: string) => string | null | undefined} resolveDbName
 */
async function dumpFromEnvFile(envPath, resolveUri, resolveDbName) {
  const fullPath = path.isAbsolute(envPath) ? envPath : path.join(ROOT, envPath);
  const env = parseEnv(readFileSync(fullPath, 'utf8'));
  const uri = resolveUri(env);
  if (!uri) {
    throw new Error(`No Mongo URI in ${envPath}`);
  }
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const dbName = resolveDbName(env, uri);
    const db = dbName ? client.db(dbName) : client.db();
    return await dumpDatabase(db, redactUri(uri));
  } finally {
    await client.close();
  }
}

const args = parseArgs(process.argv.slice(2));

if (!args.envFile && !args.allProd) {
  console.error('Usage: node scripts/ops/dump-db-schema.mjs --all-prod [--out docs/audit]');
  console.error('   or: node scripts/ops/dump-db-schema.mjs --env-file=backend/auth/.env.prod');
  process.exit(1);
}

const targets = args.allProd
  ? PROD_TARGETS
  : [
      {
        label: 'custom',
        envFile: args.envFile,
        resolveUri: (env) => env.DATABASE_URI ?? env.MONGODB_URI,
        resolveDbName: (env, uri) =>
          env.DB_NAME ??
          (() => {
            try {
              return new URL(
                uri.replace('mongodb+srv://', 'http://').replace('mongodb://', 'http://'),
              ).pathname
                .replace(/^\//, '')
                .split('?')[0];
            } catch {
              return null;
            }
          })(),
      },
    ];

const databases = [];
for (const target of targets) {
  console.log(`▶ Dumping ${target.envFile}...`);
  const row = await dumpFromEnvFile(target.envFile, target.resolveUri, target.resolveDbName);
  databases.push(row);
  console.log(`  ✔ ${row.database} (${row.collections.length} collections)`);
}

const payload = {
  metadata: {
    dumped_at: new Date().toISOString(),
    environment: args.environment,
    prod_git_commit: args.prodGitCommit,
    dumped_by: args.dumpedBy,
  },
  databases,
};

mkdirSync(args.outDir, { recursive: true });
const base = `prod-schema-baseline-${args.date}`;
const jsonPath = path.join(args.outDir, `${base}.json`);
const mdPath = path.join(args.outDir, `${base}.md`);

writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(mdPath, `${toMarkdown(payload)}\n`);

console.log('');
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
