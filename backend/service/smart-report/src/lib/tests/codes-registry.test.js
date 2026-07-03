import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import CODES from "../error-codes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const codesYamlPath = path.join(__dirname, "../../../codes.yaml");

/** @returns {string[]} */
function parseCodeKeysFromYaml(text) {
  const keys = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+):/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

describe("codes.yaml registry", () => {
  test("every codes.yaml key exists in error-codes.js", () => {
    const yamlKeys = parseCodeKeysFromYaml(
      fs.readFileSync(codesYamlPath, "utf8"),
    );
    assert.ok(yamlKeys.length >= 6);
    for (const key of yamlKeys) {
      assert.ok(CODES[key], `missing ${key} in error-codes.js`);
    }
  });
});
