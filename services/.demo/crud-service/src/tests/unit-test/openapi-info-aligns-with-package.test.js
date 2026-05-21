"use strict";

const fs = require("fs");
const path = require("path");

/** Minimal parse: first `info:` block, then `  title:` (OpenAPI root). */
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

  it("openapi.yaml info.title matches package.json name", () => {
    const title = readInfoTitle(path.join(root, "openapi.yaml"));
    expect(title).toBe(pkg.name);
  });

  it("openapi-via-gateway.yaml info.title matches package.json name", () => {
    const title = readInfoTitle(path.join(root, "openapi-via-gateway.yaml"));
    expect(title).toBe(pkg.name);
  });
});
