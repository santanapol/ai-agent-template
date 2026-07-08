import { describe, expect, it } from "vitest";

import { buildInvoiceEtag } from "./invoiceEtag";

describe("buildInvoiceEtag", () => {
  it("encodes upd_date as If-Match header value", () => {
    const etag = buildInvoiceEtag("2026-06-24T10:00:00.000Z");
    expect(etag).toBe(`W/"${btoa("2026-06-24T10:00:00.000Z")}"`);
  });

  it("returns undefined when upd_date is missing", () => {
    expect(buildInvoiceEtag(undefined)).toBeUndefined();
  });
});
