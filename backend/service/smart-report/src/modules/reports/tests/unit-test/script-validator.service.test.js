import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateScriptSource,
  unwrapMongoReadExpression,
  getCalleePropertyName,
} from "../../script-validator.service.js";
import { parse } from "acorn";

describe("script-validator.service", () => {
  test("getCalleePropertyName reads member call property", () => {
    const ast = parse('db.col.aggregate([])', { ecmaVersion: 2022 });
    const call = ast.body[0].expression;
    assert.equal(getCalleePropertyName(call.callee), "aggregate");
  });

  test("unwrapMongoReadExpression strips toArray wrapper", () => {
    const ast = parse('db.col.aggregate([]).toArray()', { ecmaVersion: 2022 });
    const call = ast.body[0].expression;
    const inner = unwrapMongoReadExpression(call);
    assert.equal(getCalleePropertyName(inner.callee), "aggregate");
  });

  test("rejects empty script", () => {
    const result = validateScriptSource("   ");
    assert.equal(result.valid, false);
  });

  test("rejects syntax errors with line number", () => {
    const result = validateScriptSource("const x = ;");
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].line);
  });

  test("rejects withReport compiled scripts", () => {
    const result = validateScriptSource(
      "withReport(async () => { return []; });",
    );
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].code, "ALREADY_COMPILED");
  });

  test("rejects insert write operations", () => {
    const result = validateScriptSource(`
      const targetDB = db.getSiblingDB("demo");
      targetDB.col.insert({ a: 1 });
    `);
    assert.equal(result.valid, false);
    assert.match(result.errors[0].message, /insert/);
  });

  test("rejects update and delete write operations", () => {
    const update = validateScriptSource('db.col.updateOne({}, { $set: { a: 1 } });');
    const del = validateScriptSource('db.col.deleteMany({});');
    assert.equal(update.valid, false);
    assert.equal(del.valid, false);
  });

  test("accepts read-only Booster-style script", () => {
    const result = validateScriptSource(`
      const targetDB = db.getSiblingDB("demo");
      const startDate = ISODate(params.startDate);
      targetDB.users.aggregate([{ $match: { created_at: { $gte: startDate } } }]);
    `);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });
});
