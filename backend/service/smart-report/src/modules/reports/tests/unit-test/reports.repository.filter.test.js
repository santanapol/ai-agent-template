import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildListFilter } from "../../reports.repository.js";

describe("buildListFilter", () => {
  test("returns empty filter by default", () => {
    assert.deepEqual(buildListFilter(), {});
  });

  test("escapes regex metacharacters in q", () => {
    const filter = buildListFilter({ q: "a.b+c" });
    assert.ok(filter.$or);
    assert.equal(filter.$or[0].name.$regex, "a\\.b\\+c");
    assert.equal(filter.$or[1].description.$regex, "a\\.b\\+c");
  });

  test("trims q before applying", () => {
    const filter = buildListFilter({ q: "  daily  " });
    assert.equal(filter.$or[0].name.$regex, "daily");
  });

  test("filters enabled true and false", () => {
    assert.deepEqual(buildListFilter({ enabled: true }), { enabled: true });
    assert.deepEqual(buildListFilter({ enabled: false }), { enabled: false });
  });

  test("ignores enabled when not boolean", () => {
    assert.deepEqual(buildListFilter({ enabled: "true" }), {});
  });

  test("schedule manual matches null schedule", () => {
    assert.deepEqual(buildListFilter({ schedule: "manual" }), {
      schedule: null,
    });
  });

  for (const [schedule, frequency] of [
    ["daily", "daily"],
    ["weekly", "weekly"],
    ["monthly", "monthly"],
  ]) {
    test(`schedule ${schedule} filters schedule.frequency`, () => {
      assert.deepEqual(buildListFilter({ schedule }), {
        "schedule.frequency": frequency,
      });
    });
  }
});
