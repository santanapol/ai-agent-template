import { describe, expect, it } from 'vitest';
import { buildInvoiceXlsx } from './buildInvoiceXlsx';
import { makeTestInvoice, makeTestTransaction } from './testFixtures';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('buildInvoiceXlsx', () => {
  it('returns an XLSX blob with expected mime type', () => {
    const invoice = makeTestInvoice();
    const transactions = [makeTestTransaction()];

    const blob = buildInvoiceXlsx(invoice, transactions);

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(XLSX_MIME);
  });

  it('supports empty transactions with totals row', () => {
    const invoice = makeTestInvoice({ iv_no: 'IV-EMPTY' });
    const blob = buildInvoiceXlsx(invoice, []);

    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe(XLSX_MIME);
  });
});
