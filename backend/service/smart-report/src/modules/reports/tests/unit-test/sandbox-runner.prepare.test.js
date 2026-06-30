import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { prepareBoosterStyleScript } from "../../sandbox-runner.service.js";

describe("prepareBoosterStyleScript", () => {
  test("injects await before assignment .toArray() calls", () => {
    const input = `
const rows = db.col.aggregate([{ $match: {} }]).toArray();
let result = [];
result;
`;
    const out = prepareBoosterStyleScript(input);
    assert.match(out, /const rows = await db\.col\.aggregate/);
    assert.doesNotMatch(out, /\.toArray\(\)/);
    assert.match(out, /return result;/);
    assert.match(out, /^\(async function \(\) \{/);
  });

  test("wraps find().toArray() assignments", () => {
    const input = `const docs = main.find({ a: 1 }).toArray();\ndocs;`;
    const out = prepareBoosterStyleScript(input);
    assert.match(out, /const docs = await main\.find/);
  });

  test("leaves already-async scripts unchanged", () => {
    const input = "(async function () { return []; })();";
    assert.equal(prepareBoosterStyleScript(input), input);
  });

  test("converts trailing identifier to return (Booster result; / rows;)", () => {
    const input = `const rows = db.col.aggregate([]).toArray();\nrows;`;
    const out = prepareBoosterStyleScript(input);
    assert.match(out, /return rows;/);
  });
});
