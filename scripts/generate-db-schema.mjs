#!/usr/bin/env node
/**
 * Dump MongoDB collection names/indexes from running dev instance → docs/generated/db-schema.md
 * Usage: node scripts/generate-db-schema.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT, 'backend/auth/package.json'));
const { MongoClient } = require('mongodb');

const authEnvPath = path.join(ROOT, 'backend/auth/.env.harness');

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const authEnv = parseEnv(readFileSync(authEnvPath, 'utf8'));
const uri = authEnv.DATABASE_URI;
if (!uri) {
  console.error('DATABASE_URI not found in auth env — boot stack first');
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const lines = [
  '# Generated database schema',
  '',
  `> Generated from \`${uri}\` — do not edit by hand.`,
  '',
  `Generated: ${new Date().toISOString().slice(0, 10)}`,
  '',
];

const collections = await db.listCollections().toArray();
for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
  lines.push(`## ${name}`);
  lines.push('');
  const indexes = await db.collection(name).indexes();
  for (const idx of indexes) {
    lines.push(`- \`${JSON.stringify(idx.key)}\`${idx.unique ? ' (unique)' : ''}`);
  }
  lines.push('');
}

await client.close();

const outDir = path.join(ROOT, 'docs/generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'db-schema.md'), lines.join('\n'));
console.log('Wrote docs/generated/db-schema.md');
