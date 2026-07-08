#!/usr/bin/env node
/**
 * spec:consistency gate — branch-report service
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");

const CONFIG = {
  specDir: resolve(PKG_ROOT, "../../../docs/specs/backend/branch-report"),
  openapi: resolve(PKG_ROOT, "openapi.yaml"),
  rolesModule: resolve(PKG_ROOT, "../../shared/platform-roles/index.js"),
  rolesDoc: "business-domain.md",
  rolesHeadingMatch: /system roles/i,
};

const PW_KEYWORDS = /password|รหัสผ่าน/i;
const YAML_SCHEMA_KW = new Set([
  "type",
  "minLength",
  "maxLength",
  "format",
  "pattern",
  "description",
  "example",
  "enum",
  "items",
  "properties",
  "required",
  "nullable",
  "default",
  "minimum",
  "maximum",
  "additionalProperties",
  "oneOf",
  "allOf",
  "anyOf",
  "$ref",
]);

const errors = [];
const fail = (msg) => errors.push(msg);

function walkMarkdown(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkMarkdown(full));
    else if (extname(name) === ".md") out.push(full);
  }
  return out;
}

function checkLinks(mdFiles) {
  for (const file of mdFiles) {
    const base = dirname(file);
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/\]\(([^)#]+\.(?:md|yaml))\)/g)) {
      const target = resolve(base, m[1]);
      if (!existsSync(target)) {
        fail(`[link] ${file}: broken → ${m[1]}`);
      }
    }
  }
}

function checkPassword(mdFiles) {
  if (!existsSync(CONFIG.openapi)) return;
  const openapi = readFileSync(CONFIG.openapi, "utf8");
  const schemaMins = [...openapi.matchAll(/minLength:\s*(\d+)/g)].map((m) =>
    Number(m[1]),
  );
  for (const file of mdFiles) {
    if (!PW_KEYWORDS.test(readFileSync(file, "utf8"))) continue;
    for (const m of readFileSync(file, "utf8").matchAll(
      /minLength[:\s]+(\d+)/gi,
    )) {
      const n = Number(m[1]);
      if (schemaMins.length && !schemaMins.includes(n)) {
        fail(
          `[password] ${file}: minLength ${n} ≠ openapi (${schemaMins.join(", ")})`,
        );
      }
    }
  }
}

async function checkRoles(mdFiles) {
  if (!existsSync(CONFIG.rolesModule)) return;
  let validRoles;
  try {
    ({ VALID_ROLES: validRoles } = await import(CONFIG.rolesModule));
  } catch {
    return;
  }
  const doc = mdFiles.find((f) => f.endsWith(CONFIG.rolesDoc));
  if (!doc) return;
  const lines = readFileSync(doc, "utf8").split("\n");
  const start = lines.findIndex(
    (l) => /^#{2,4}\s/.test(l) && CONFIG.rolesHeadingMatch.test(l),
  );
  if (start === -1) return;
}

const mdFiles = walkMarkdown(CONFIG.specDir);
checkLinks(mdFiles);
checkPassword(mdFiles);
await checkRoles(mdFiles);

if (errors.length) {
  console.error(`\n✗ spec:consistency — พบ ${errors.length} ปัญหา\n`);
  for (const e of errors) console.error(e);
  console.error("");
  process.exit(1);
}
console.log(`✓ spec:consistency — ${mdFiles.length} md files: links OK`);
