import { renderHook, act } from '@testing-library/react';
import { useAgentFees } from '../hooks/useAgentFees';
import * as api from '../../../lib/agentFeesApiClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../lib/agentFeesApiClient');

describe('useAgentFees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch fees and update state', async () => {
    const mockFees = [
      { _id: '1', fee_rate: 10, company_id: 'C1', main_cate_id: 'M1' }
    ];
    vi.mocked(api.listAgentFees).mockResolvedValueOnce({
      data: mockFees as any,
      total: 1
    });

    const { result } = renderHook(() => useAgentFees('agent123'));
    
    await act(async () => {
      await result.current.fetchFees();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.fees).toEqual(mockFees);
    expect(result.current.total).toBe(1);
    expect(api.listAgentFees).toHaveBeenCalledWith('agent123', { page: 1, limit: 10 });
  });

  it('should fetch master data', async () => {
    const mockCompanies = [{ _id: 'c1', name: { en: 'Comp 1' } }];
    const mockCategories = [{ _id: 'cat1', name: { en: 'Cat 1' } }];
    
    vi.mocked(api.getGameCompanies).mockResolvedValueOnce(mockCompanies as any);
    vi.mocked(api.getGameCategories).mockResolvedValueOnce(mockCategories as any);

    const { result } = renderHook(() => useAgentFees('agent123'));
    
    await act(async () => {
      await result.current.fetchMasterData();
    });

    expect(result.current.companies).toEqual(mockCompanies);
    expect(result.current.categories).toEqual(mockCategories);
  });
});
