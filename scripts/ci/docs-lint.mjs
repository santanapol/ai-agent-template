#!/usr/bin/env node
/**
 * Docs linter — validates ai-agent-template skeleton structure.
 * Run: node scripts/ci/docs-lint.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const errors = [];
const warnings = [];

function fail(msg, fix) {
  errors.push({ msg, fix });
}

function warn(msg, fix) {
  warnings.push({ msg, fix });
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walkMarkdown(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMarkdown(rel, out);
    else if (ent.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

function extractLinks(content, file) {
  const links = [];
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let href = m[2].trim();
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    href = href.split(/\s+/)[0];
    links.push({ href, file });
  }
  return links;
}

function resolveLink(fromFile, href) {
  const fromDir = path.dirname(fromFile);
  let target = href.split('#')[0];
  if (!target) return null;
  return path.normalize(path.join(fromDir, target)).replace(/\\/g, '/');
}

function checkLinks(files) {
  for (const file of files) {
    const content = read(file);
    for (const { href } of extractLinks(content, file)) {
      const resolved = resolveLink(file, href);
      if (!resolved) continue;
      const abs = path.join(ROOT, resolved);
      if (!fs.existsSync(abs)) {
        fail(`Broken link in ${file}: (${href})`, `Fix or create ${resolved}`);
      }
    }
  }
}

function checkSkeleton() {
  for (const f of ['AGENTS.md', 'README.md', 'RUNBOOK.md', 'code-base/README.md']) {
    if (!exists(f)) {
      fail(`Missing required file: ${f}`, `Create ${f}`);
    }
  }

  for (const dir of ['code-base/backend', 'code-base/frontend', 'docs', 'coding-standard']) {
    if (!exists(dir)) {
      fail(`Missing directory: ${dir}/`, `Create ${dir}/ with .gitkeep`);
    }
  }

  for (const f of [
    'code-base/backend/.gitkeep',
    'code-base/frontend/.gitkeep',
    'docs/.gitkeep',
    'coding-standard/.gitkeep',
  ]) {
    if (!exists(f)) {
      fail(`Missing placeholder: ${f}`, `Create empty ${f}`);
    }
  }

  for (const removed of ['backend', 'frontend', '.claude']) {
    if (exists(removed)) {
      fail(`Removed path still present: ${removed}/`, `Delete ${removed}/ per ai-agent-template layout`);
    }
  }
}

function findMissionControlDirs(dir = '.', out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const ent of fs.readdirSync(full, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.dev-run') continue;
    const rel = dir === '.' ? ent.name : path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '_mission-control') {
        out.push(rel.replace(/\\/g, '/'));
      } else {
        findMissionControlDirs(rel, out);
      }
    }
  }
  return out;
}

function checkForbiddenPaths() {
  for (const rel of findMissionControlDirs()) {
    fail(`Forbidden _mission-control directory: ${rel}/`, 'Move specs to docs/ and delete _mission-control/');
  }

  let trackedTasks = '';
  try {
    trackedTasks = execSync('git ls-files tasks', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    trackedTasks = '';
  }
  if (trackedTasks) {
    fail(
      'Tracked files under tasks/ (ephemeral plans must not be committed)',
      'git rm --cached tasks/*; durable plans belong in docs/exec-plans/',
    );
  }
}

checkSkeleton();
checkForbiddenPaths();

const linkFiles = [
  'README.md',
  'AGENTS.md',
  'RUNBOOK.md',
  'scripts/README.md',
  ...walkMarkdown('knowledge'),
  ...walkMarkdown('docs'),
];
checkLinks(linkFiles);

console.log('docs-lint results\n');

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ⚠ ${w.msg}`);
    console.log(`    → ${w.fix}`);
  }
  console.log('');
}

if (errors.length) {
  console.error(`Errors (${errors.length}):`);
  for (const e of errors) {
    console.error(`  ✗ ${e.msg}`);
    console.error(`    → ${e.fix}`);
  }
  process.exit(1);
}

console.log('✓ docs-lint passed');
process.exit(0);
