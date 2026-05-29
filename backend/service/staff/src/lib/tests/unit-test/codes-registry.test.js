import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import CODES from "../../error-codes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const codesYamlPath = path.join(__dirname, "../../../../codes.yaml");

function parseCodeKeysFromYaml(text) {
  const keys = [];
  let inCodes = false;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "codes:") {
      inCodes = true;
      continue;
    }
    if (!inCodes) continue;
    if (/^[a-zA-Z]/.test(line) && !line.startsWith(" ")) {
      break;
    }
    const m = line.match(/^ {2}([A-Z0-9_]+):/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

describe("codes.yaml registry", () => {
  test("error-codes.js keys match codes.yaml", () => {
    const yamlKeys = parseCodeKeysFromYaml(
      fs.readFileSync(codesYamlPath, "utf8"),
    );
    const jsKeys = Object.keys(CODES);
    assert.deepStrictEqual([...jsKeys].sort(), [...yamlKeys].sort());
  });

  test("STAFF_AUTH_REVOKE_PENDING is registered", () => {
    assert.strictEqual(
      CODES.STAFF_AUTH_REVOKE_PENDING,
      "STAFF_AUTH_REVOKE_PENDING",
    );
  });
});
