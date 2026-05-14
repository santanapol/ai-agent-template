"use strict";

const {
  encodeEtagFromDate,
  encodeEtagFromItemDoc,
  decodeIfMatch,
} = require("../../etag");

describe("etag", () => {
  it("encodeEtagFromDate round-trips through decodeIfMatch", () => {
    const d = new Date("2024-06-01T12:00:00.000Z");
    const tag = encodeEtagFromDate(d);
    expect(tag.startsWith('W/"')).toBe(true);
    expect(decodeIfMatch(tag)).toEqual(d);
  });

  it("decodeIfMatch returns null for malformed value", () => {
    expect(decodeIfMatch("not-an-etag")).toBeNull();
    expect(decodeIfMatch('W/"!!!"')).toBeNull();
  });

  it("encodeEtagFromItemDoc prefers upd_date over cr_date", () => {
    const cr = new Date("2020-01-01T00:00:00.000Z");
    const upd = new Date("2021-01-01T00:00:00.000Z");
    const tagBoth = encodeEtagFromItemDoc({ upd_date: upd, cr_date: cr });
    expect(decodeIfMatch(tagBoth)).toEqual(upd);

    const tagCrOnly = encodeEtagFromItemDoc({ cr_date: cr });
    expect(decodeIfMatch(tagCrOnly)).toEqual(cr);
  });
});
