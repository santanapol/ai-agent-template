#!/usr/bin/env node
/**
 * Docs linter — validates ai-agent-template skeleton structure.
 * Run: node harness/scripts/ci/docs-lint.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadHarnessConfig } from './load-harness-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');

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

let harness;
try {
  harness = loadHarnessConfig(ROOT);
} catch (err) {
  fail(String(err.message), 'Fix harness.config.yaml');
  harness = { layout: 'code-base', code: { backend: 'code-base/backend', frontend: 'code-base/frontend' } };
}

function checkSkeleton() {
  for (const f of [
    'AGENTS.md',
    'README.md',
    'harness.config.yaml',
    'harness/README.md',
    'harness/HARNESS-RUNBOOK.md',
    'code-base/README.md',
    'docs/README.md',
    'coding-standard/README.md',
  ]) {
    if (!exists(f)) {
      fail(`Missing required file: ${f}`, `Create ${f}`);
    }
  }

  for (const dir of [
    'harness/knowledge',
    'harness/references',
    'harness/scripts/agent',
    'docs',
    'docs/exec-plans/active',
    'docs/exec-plans/completed',
    'docs/releases',
    'coding-standard',
  ]) {
    if (!exists(dir)) {
      fail(`Missing directory: ${dir}/`, `Create ${dir}/`);
    }
  }

  if (!exists('docs/.gitkeep') && !exists('docs/README.md')) {
    fail('Missing docs placeholder or README', 'Create docs/.gitkeep or docs/README.md');
  }

  if (!exists('coding-standard/.gitkeep')) {
    fail('Missing placeholder: coding-standard/.gitkeep', 'Create empty coding-standard/.gitkeep');
  }

  for (const legacy of ['knowledge', 'references', 'scripts', 'RUNBOOK.md']) {
    if (exists(legacy)) {
      const msg =
        legacy === 'RUNBOOK.md'
          ? `Legacy root file still present: ${legacy}`
          : `Legacy root path still present: ${legacy}/`;
      const fix =
        legacy === 'RUNBOOK.md'
          ? 'Use harness/HARNESS-RUNBOOK.md instead'
          : `Use harness/${legacy}/ instead`;
      fail(msg, fix);
    }
  }

  if (harness.layout === 'code-base') {
    for (const dir of ['code-base/backend', 'code-base/frontend']) {
      if (!exists(dir)) {
        fail(`Missing directory: ${dir}/`, `Create ${dir}/ with .gitkeep (layout: code-base)`);
      }
    }
    for (const f of ['code-base/backend/.gitkeep', 'code-base/frontend/.gitkeep']) {
      if (!exists(f)) {
        fail(`Missing placeholder: ${f}`, `Create empty ${f}`);
      }
    }
    for (const legacy of ['backend', 'frontend']) {
      if (exists(legacy)) {
        warn(
          `Root ${legacy}/ present while layout is code-base`,
          `Use code-base/${legacy}/ or run ./harness/scripts/agent/set-code-layout.sh root`,
        );
      }
    }
  } else if (harness.layout === 'root') {
    for (const zone of [harness.code.backend, harness.code.frontend]) {
      if (!zone || zone.startsWith('code-base/')) {
        warn(
          `layout is root but code zone is ${zone}`,
          'Set code.backend and code.frontend in harness.config.yaml to your repo paths',
        );
      }
    }
  }

  if (exists('.claude')) {
    fail('Removed path still present: .claude/', 'Delete .claude/ per ai-agent-template layout');
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

  for (const rel of ['SPEC.md', 'docs/SPEC.md']) {
    if (exists(rel)) {
      fail(`Forbidden spec at ${rel}`, 'Move to docs/specs/<slug>.md');
    }
  }

  if (exists('spec')) {
    const specDir = path.join(ROOT, 'spec');
    const entries = fs.readdirSync(specDir);
    if (entries.length > 0) {
      fail('Forbidden spec/ directory at repo root', 'Use docs/specs/<slug>.md instead');
    }
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
  'harness/README.md',
  'harness/HARNESS-RUNBOOK.md',
  'code-base/README.md',
  'coding-standard/README.md',
  '.cursor/rules/agent-skills.mdc',
  '.cursor/USAGE.md',
  '.cursor/VENDOR.md',
  '.cursor/README.md',
  ...walkMarkdown('harness/knowledge'),
  ...walkMarkdown('docs'),
  ...walkMarkdown('.cursor/commands'),
];
checkLinks(linkFiles);

console.log('docs-lint results\n');
console.log(`Layout: ${harness.layout} (backend: ${harness.code.backend}, frontend: ${harness.code.frontend})\n`);

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
