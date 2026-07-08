import { describe, expect, it } from "vitest";

import { buildInvoicePdf } from "./buildInvoicePdf";
import { makeTestInvoice, makeTestTransaction } from "./testFixtures";

async function blobStartsWithPdfMagic(blob: Blob): Promise<boolean> {
  const buffer = await blob.arrayBuffer();
  const header = new TextDecoder().decode(buffer.slice(0, 4));
  return header === "%PDF";
}

describe("buildInvoicePdf", () => {
  it("returns a PDF blob with valid magic bytes", async () => {
    const invoice = makeTestInvoice();
    const transactions = [makeTestTransaction()];

    const blob = buildInvoicePdf(invoice, transactions);

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/pdf");
    expect(await blobStartsWithPdfMagic(blob)).toBe(true);
  });

  it("supports empty transactions with totals row", async () => {
    const invoice = makeTestInvoice({ iv_no: "IV-EMPTY" });
    const blob = buildInvoicePdf(invoice, []);

    expect(blob.size).toBeGreaterThan(0);
    expect(await blobStartsWithPdfMagic(blob)).toBe(true);
  });
});
