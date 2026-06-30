import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  compileBoosterScript,
  transformScriptBody,
} from "../../script-compiler.service.js";

describe("script-compiler.service", () => {
  test("wraps trailing aggregate in withReport with return await", () => {
    const input = `
const targetDB = db.getSiblingDB("gpp_777ww");
const startDate = ISODate(params.startDate);

targetDB.users.aggregate([
  { $match: { created_at: { $gte: startDate } } },
]);
`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(result.compiledScript, /^withReport\(async \(\) => \{/);
    assert.match(result.compiledScript, /return await targetDB\.users\.aggregate/);
    assert.doesNotMatch(result.compiledScript, /\.toArray\(\)/);
  });

  test("wraps trailing find expression", () => {
    const input = `db.getSiblingDB("demo").items.find({ active: true });`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(result.compiledScript, /return await db\.getSiblingDB\("demo"\)\.items\.find/);
  });

  test("wraps trailing find cursor chain", () => {
    const input = `db.getSiblingDB("demo").member.find({ active: true }).projection({ _id: 0 }).sort({ _id: -1 }).limit(10);`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(
      result.compiledScript,
      /return await db\.getSiblingDB\("demo"\)\.member\.find\(\{ active: true \}\)\.projection/,
    );
    assert.match(result.compiledScript, /\.limit\(10\);/);
  });

  test("wraps trailing findOne expression", () => {
    const input = `db.getSiblingDB("demo").items.findOne({ _id: 1 });`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(result.compiledScript, /return await .*findOne/);
  });

  test("injects await for const aggregate assignment without toArray", () => {
    const input = `
const rows = db.getSiblingDB("demo").items.aggregate([{ $match: {} }]);
rows;
`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(result.compiledScript, /const rows = await db\.getSiblingDB/);
    assert.match(result.compiledScript, /return rows;/);
  });

  test("strips toArray and injects await on assignment", () => {
    const input = `
const rows = db.getSiblingDB("demo").items.aggregate([{ $match: {} }]).toArray();
rows;
`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(result.compiledScript, /const rows = await db\.getSiblingDB/);
    assert.doesNotMatch(result.compiledScript, /\.toArray\(\)/);
    assert.match(result.compiledScript, /return rows;/);
  });

  test("handles batch script with multiple toArray calls", () => {
    const input = `
const mainDB = db.getSiblingDB("demo");
const summary = mainDB.items.aggregate([{ $group: { _id: "$type", total: { $sum: 1 } } }]).toArray();
let result = [];
if (summary.length > 0) {
  const docs = mainDB.items.find({ active: true }).toArray();
  result = docs.map((doc) => ({ id: doc._id }));
}
result;
`;
    const result = compileBoosterScript(input);
    assert.equal(result.success, true);
    assert.match(result.compiledScript, /const summary = await mainDB\.items\.aggregate/);
    assert.match(result.compiledScript, /const docs = await mainDB\.items\.find/);
    assert.match(result.compiledScript, /return result;/);
    assert.doesNotMatch(result.compiledScript, /\.toArray\(\)/);
  });

  test("rejects compiled withReport input", () => {
    const result = compileBoosterScript(
      "withReport(async () => { return []; });",
    );
    assert.equal(result.success, false);
    assert.equal(result.errors[0].code, "ALREADY_COMPILED");
  });

  test("rejects write operations before compile", () => {
    const result = compileBoosterScript(
      'db.getSiblingDB("demo").items.insert({ a: 1 });',
    );
    assert.equal(result.success, false);
    assert.match(result.errors[0].message, /insert/);
  });

  test("transformScriptBody preserves comments and intermediate logic", () => {
    const input = `
// filter active users
const targetDB = db.getSiblingDB("demo");
const activeOnly = true;
targetDB.users.find({ active: activeOnly });
`;
    const body = transformScriptBody(input);
    assert.match(body, /\/\/ filter active users/);
    assert.match(body, /const activeOnly = true;/);
    assert.match(body, /return await targetDB\.users\.find/);
  });
});
