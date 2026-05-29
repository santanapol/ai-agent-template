import { test, describe } from "node:test";
import assert from "node:assert";

import {
  encodeEtagFromDate,
  encodeEtagFromItemDoc,
  decodeIfMatch,
} from "../../etag.js";

describe("etag", () => {
  test("encodeEtagFromDate round-trips via decodeIfMatch", () => {
    const date = new Date("2026-05-28T10:00:00.000Z");
    const etag = encodeEtagFromDate(date);
    assert.match(etag, /^W\//);
    const decoded = decodeIfMatch(etag);
    assert.strictEqual(decoded.toISOString(), date.toISOString());
  });

  test("encodeEtagFromItemDoc prefers upd_date", () => {
    const upd = new Date("2026-05-28T12:00:00.000Z");
    const cr = new Date("2026-05-27T12:00:00.000Z");
    const etag = encodeEtagFromItemDoc({ upd_date: upd, cr_date: cr });
    assert.strictEqual(decodeIfMatch(etag).toISOString(), upd.toISOString());
  });

  test("decodeIfMatch returns null for invalid header", () => {
    assert.strictEqual(decodeIfMatch("invalid"), null);
    assert.strictEqual(decodeIfMatch(null), null);
  });
});
