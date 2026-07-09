#!/usr/bin/env node
/**
 * Payload benchmark for API Network Audit endpoints.
 * Usage: node scripts/ops/payload-benchmark-api-audit.mjs [--base http://localhost:3005]
 *
 * Requires authenticated cookie jar from harness login (see RUNBOOK.md).
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3005";

const probes = [
  { id: "PAY-001", label: "auth/me/branches (full)", path: "/auth/me/branches" },
  { id: "PAY-001-opt", label: "auth/me/branches?q=77&limit=20", path: "/auth/me/branches?q=77&limit=20" },
  { id: "PAY-004", label: "game-companies (full)", path: "/api/v1/agent-invoice/master-data/game-companies" },
  {
    id: "PAY-004-opt",
    label: "game-companies?fields=matrix",
    path: "/api/v1/agent-invoice/master-data/game-companies?fields=matrix",
  },
  { id: "PAY-005", label: "profiles/count active", path: "/api/v1/staff/profiles/count?status=active" },
  {
    id: "PAY-003",
    label: "invite-links?limit=20",
    path: "/api/v1/branch-report/invite-links?limit=20",
  },
];

async function measure(path) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { credentials: "include" });
  const text = await res.text();
  return { status: res.status, bytes: Buffer.byteLength(text, "utf8") };
}

const rows = [];
for (const probe of probes) {
  try {
    const { status, bytes } = await measure(probe.path);
    rows.push({ ...probe, status, bytes });
  } catch (err) {
    rows.push({ ...probe, status: "ERR", bytes: 0, error: String(err) });
  }
}

const lines = [
  "| ID | Endpoint | Status | Bytes |",
  "|----|----------|--------|-------|",
  ...rows.map((r) => `| ${r.id} | ${r.label} | ${r.status} | ${r.bytes} |`),
];

const markdown = `# API audit payload benchmark\n\nBase: ${base}\n\n${lines.join("\n")}\n`;
console.log(markdown);

const outPath = resolve("docs/ops/payload-benchmark-api-audit-latest.md");
writeFileSync(outPath, markdown);
console.error(`Wrote ${outPath}`);
