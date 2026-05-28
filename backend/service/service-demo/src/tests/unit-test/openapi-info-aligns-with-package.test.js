import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readInfoVersion(openapiPath) {
  const text = fs.readFileSync(openapiPath, "utf8");
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() !== "info:") {
    i += 1;
  }
  if (i >= lines.length) {
    throw new Error(`info: block not found in ${openapiPath}`);
  }
  i += 1;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[a-zA-Z]/.test(line) && !line.startsWith(" ")) {
      break;
    }
    const m = line.match(/^ {2}version:\s*(.+)$/);
    if (m) {
      const raw = m[1].trim();
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        return raw.slice(1, -1);
      }
      return raw;
    }
    i += 1;
  }
  throw new Error(`version not found under info in ${openapiPath}`);
}

function readInfoTitle(openapiPath) {
  const text = fs.readFileSync(openapiPath, "utf8");
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() !== "info:") {
    i += 1;
  }
  if (i >= lines.length) {
    throw new Error(`info: block not found in ${openapiPath}`);
  }
  i += 1;
  while (i < lines.length) {
    const line = lines[i];
    if (/^[a-zA-Z]/.test(line) && !line.startsWith(" ")) {
      break;
    }
    const m = line.match(/^ {2}title:\s*(.+)$/);
    if (m) {
      const raw = m[1].trim();
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        return raw.slice(1, -1);
      }
      return raw;
    }
    i += 1;
  }
  throw new Error(`title not found under info in ${openapiPath}`);
}

describe("OpenAPI info.title vs package.json name (backend SoT)", () => {
  const root = path.join(__dirname, "../../..");
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );

  test("openapi.yaml info.title matches package.json name", () => {
    const title = readInfoTitle(path.join(root, "openapi.yaml"));
    assert.strictEqual(title, pkg.name);
  });

  test("openapi-via-gateway.yaml info.title matches package.json name", () => {
    const title = readInfoTitle(path.join(root, "openapi-via-gateway.yaml"));
    assert.strictEqual(title, pkg.name);
  });

  test("openapi.yaml info.version matches package.json version", () => {
    const v = readInfoVersion(path.join(root, "openapi.yaml"));
    assert.strictEqual(v, pkg.version);
  });

  test("openapi-via-gateway.yaml info.version matches package.json version", () => {
    const v = readInfoVersion(path.join(root, "openapi-via-gateway.yaml"));
    assert.strictEqual(v, pkg.version);
  });
});
