#!/usr/bin/env node
/**
 * Docs linter — validates knowledge base structure for harness engineering.
 * Run: node scripts/docs-lint.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

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

/** Extract markdown links: [text](href) — skip http/mailto/# */
function extractLinks(content, file) {
  const links = [];
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    let href = m[2].trim();
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    href = href.split(/\s+/)[0]; // drop title
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

const SPEC_SERVICES = {
  auth: { dir: 'docs/specs/backend/auth', spec: 'auth-spec.md' },
  gateway: { dir: 'docs/specs/backend/gateway', spec: 'gateway-spec.md' },
  staff: { dir: 'docs/specs/backend/staff', spec: 'staff-spec.md' },
  'agent-invoice': { dir: 'docs/specs/backend/agent-invoice', spec: 'agent-invoice-spec.md' },
  'smart-report': { dir: 'docs/specs/backend/smart-report', spec: 'smart-report-spec.md' },
  'branch-report': { dir: 'docs/specs/backend/branch-report', spec: 'branch-report-spec.md' },
};

const REQUIRED_SPEC_FILES = [
  'TESTING.md',
  'WORKFLOW.md',
  'business-domain.md',
  'technical-architecture.md',
];

function checkSpecCoverage() {
  for (const [name, { dir, spec }] of Object.entries(SPEC_SERVICES)) {
    if (!exists(dir)) {
      fail(`Missing spec directory for ${name}`, `Create ${dir}/`);
      continue;
    }
    if (!exists(`${dir}/${spec}`)) {
      fail(`Missing central spec for ${name}`, `Create ${dir}/${spec}`);
    }
    for (const f of REQUIRED_SPEC_FILES) {
      if (!exists(`${dir}/${f}`)) {
        fail(`Missing ${f} for ${name}`, `Create ${dir}/${f}`);
      }
    }
  }
}

const QUALITY_DOMAINS = [
  'auth',
  'gateway',
  'staff',
  'agent-invoice',
  'smart-report',
  'branch-report',
  'demo-service',
  'backoffice-next',
];

function checkQualityScore() {
  const file = 'docs/QUALITY_SCORE.md';
  if (!exists(file)) {
    fail('Missing docs/QUALITY_SCORE.md', 'Create docs/QUALITY_SCORE.md with domain table');
    return;
  }
  const content = read(file);
  for (const domain of QUALITY_DOMAINS) {
    if (!content.includes(`| ${domain} `) && !content.includes(`| **${domain}**`)) {
      fail(`QUALITY_SCORE.md missing domain: ${domain}`, `Add row for ${domain} in the grade table`);
    }
  }
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function parseFrontMatter(content) {
  const m = content.match(FRONT_MATTER_RE);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function checkExecPlans() {
  for (const sub of ['active', 'completed']) {
    const dir = `docs/exec-plans/${sub}`;
    if (!exists(dir)) {
      fail(`Missing ${dir}/`, `Create ${dir}/ per docs/exec-plans/README.md`);
      continue;
    }
    const files = fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md'));
    const now = Date.now();
    const staleMs = 30 * 24 * 60 * 60 * 1000;

    for (const f of files) {
      const rel = `${dir}/${f}`;
      const content = read(rel);
      const fm = parseFrontMatter(content);
      if (!fm) {
        fail(`Exec plan missing front matter: ${rel}`, 'Add YAML front matter (status, created, updated, services)');
        continue;
      }
      for (const key of ['status', 'created', 'updated', 'services']) {
        if (!fm[key]) {
          fail(`Exec plan ${rel} missing front matter key: ${key}`, `Add ${key} to YAML front matter`);
        }
      }
      if (sub === 'active' && fm.updated) {
        const updated = new Date(fm.updated).getTime();
        if (!Number.isNaN(updated) && now - updated > staleMs) {
          warn(
            `Active plan stale (>30d): ${rel}`,
            'Update progress log or move to completed/',
          );
        }
      }
    }
  }

  if (!exists('docs/exec-plans/tech-debt-tracker.md')) {
    fail('Missing tech-debt-tracker.md', 'Create docs/exec-plans/tech-debt-tracker.md');
  }
}

function checkRequiredRootDocs() {
  for (const f of ['AGENTS.md', 'docs/golden-principles.md', 'docs/exec-plans/README.md']) {
    if (!exists(f)) {
      fail(`Missing required doc: ${f}`, `Create ${f}`);
    }
  }
}

// --- main ---
checkRequiredRootDocs();
checkSpecCoverage();
checkQualityScore();
checkExecPlans();

const linkFiles = [
  'README.md',
  'AGENTS.md',
  ...walkMarkdown('docs'),
];
checkLinks(linkFiles);

// observability.md is optional until Phase 4 — warn only
if (!exists('docs/observability.md')) {
  warnings.push({
    msg: 'docs/observability.md not yet created',
    fix: 'Will be added in observability phase',
  });
}

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
