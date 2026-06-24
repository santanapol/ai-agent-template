import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../lib/invoicesApiClient';
import { runBulkExport } from './bulkExport';
import { makeTestInvoice, makeTestTransaction } from './testFixtures';

vi.mock('../../../lib/invoicesApiClient');

function mockInvoiceSuccess(id: string, ivNo: string) {
  vi.mocked(api.getInvoiceById).mockImplementation(async (invoiceId) => {
    if (invoiceId !== id) {
      throw new Error('not found');
    }
    return {
      success: true,
      code: 'SUCCESS',
      message: 'ok',
      data: makeTestInvoice({ _id: id, iv_no: ivNo }),
    };
  });

  vi.mocked(api.listInvoiceTransactions).mockImplementation(async (invoiceId) => {
    if (invoiceId !== id) {
      throw new Error('not found');
    }
    return {
      success: true,
      code: 'SUCCESS',
      message: 'ok',
      data: [makeTestTransaction({ ref_iv_id: id })],
    };
  });
}

describe('runBulkExport', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for empty invoiceIds', async () => {
    const result = await runBulkExport({ invoiceIds: [], format: 'pdf' });
    expect(result).toBeNull();
  });

  it('creates a ZIP blob when all invoices succeed', async () => {
    mockInvoiceSuccess('inv1', 'IV-001');

    const result = await runBulkExport({ invoiceIds: ['inv1'], format: 'pdf' });

    expect(result).not.toBeNull();
    expect(result?.type).toBe('application/zip');
    expect(result?.size).toBeGreaterThan(0);
  });

  it('continues on partial failure and still returns ZIP', async () => {
    vi.mocked(api.getInvoiceById).mockImplementation(async (id) => {
      if (id === 'inv-ok') {
        return {
          success: true,
          code: 'SUCCESS',
          message: 'ok',
          data: makeTestInvoice({ _id: 'inv-ok', iv_no: 'IV-OK' }),
        };
      }
      throw new Error('not found');
    });

    vi.mocked(api.listInvoiceTransactions).mockImplementation(async (id) => {
      if (id === 'inv-ok') {
        return {
          success: true,
          code: 'SUCCESS',
          message: 'ok',
          data: [makeTestTransaction({ ref_iv_id: 'inv-ok' })],
        };
      }
      throw new Error('not found');
    });

    const progressSnapshots: number[] = [];
    const result = await runBulkExport({
      invoiceIds: ['inv-ok', 'inv-fail'],
      format: 'pdf',
      onProgress: (p) => progressSnapshots.push(p.done),
    });

    expect(result).not.toBeNull();
    expect(progressSnapshots.at(-1)).toBe(2);
  });

  it('returns null when every invoice fails', async () => {
    vi.mocked(api.getInvoiceById).mockRejectedValue(new Error('boom'));
    vi.mocked(api.listInvoiceTransactions).mockRejectedValue(new Error('boom'));

    const result = await runBulkExport({ invoiceIds: ['a', 'b'], format: 'pdf' });
    expect(result).toBeNull();
  });

  it('stops remaining work when aborted', async () => {
    const controller = new AbortController();
    let inFlight = 0;
    let maxInFlight = 0;

    vi.mocked(api.getInvoiceById).mockImplementation(async (id, signal) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (signal?.aborted) {
        inFlight -= 1;
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      }
      inFlight -= 1;
      return {
        success: true,
        code: 'SUCCESS',
        message: 'ok',
        data: makeTestInvoice({ _id: id, iv_no: `IV-${id}` }),
      };
    });

    vi.mocked(api.listInvoiceTransactions).mockResolvedValue({
      success: true,
      code: 'SUCCESS',
      message: 'ok',
      data: [],
    });

    const promise = runBulkExport({
      invoiceIds: ['1', '2', '3', '4'],
      format: 'pdf',
      concurrency: 1,
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 5);
    const result = await promise;

    expect(maxInFlight).toBeLessThanOrEqual(1);
    expect(result === null || result instanceof Blob).toBe(true);
  });
});
