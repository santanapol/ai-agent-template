import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listInvoices,
  listInvoiceAgents,
  getInvoiceById,
  listInvoiceTransactions,
  generateInvoices,
  updateInvoiceStatus,
} from './invoicesApiClient';

const { mockGet, mockPost, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('./baseApiClient', () => ({
  baseClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
  },
}));

describe('invoicesApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listInvoices calls GET /api/v1/invoices', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: { items: [], pagination: {} } } });
    await listInvoices({ page: 1, limit: 10 });
    expect(mockGet).toHaveBeenCalledWith('/api/v1/invoices', { params: { page: 1, limit: 10 }, signal: undefined });
  });

  it('listInvoiceAgents calls GET /api/v1/invoices/agent', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } });
    await listInvoiceAgents();
    expect(mockGet).toHaveBeenCalledWith('/api/v1/invoices/agent', { signal: undefined });
  });

  it('getInvoiceById calls GET /api/v1/invoices/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: {} } });
    await getInvoiceById('abc123');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/invoices/abc123', { signal: undefined });
  });

  it('listInvoiceTransactions calls GET transactions endpoint', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [] } });
    await listInvoiceTransactions('abc123');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/invoices/abc123/transactions', { signal: undefined });
  });

  it('generateInvoices calls POST /api/v1/invoices/generate', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: { generated_count: 2 } } });
    await generateInvoices({ month: '2025-06' });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/invoices/generate', { month: '2025-06' });
  });

  it('updateInvoiceStatus calls PUT status endpoint', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true, data: {} } });
    await updateInvoiceStatus('abc123', 'PAID', 'W/"abc"');
    expect(mockPut).toHaveBeenCalledWith('/api/v1/invoices/abc123/status', { status: 'PAID' }, { headers: { 'If-Match': 'W/"abc"' } });
  });
});
