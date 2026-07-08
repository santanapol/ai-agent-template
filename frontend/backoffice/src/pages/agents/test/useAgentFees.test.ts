import { renderHook, act } from '@testing-library/react';
import { useAgentFees } from '../hooks/useAgentFees';
import * as api from '../../../lib/agentFeesApiClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AgentFee, GameCompany, GameCategory } from '../../../types/agentFees';

vi.mock('../../../lib/agentFeesApiClient');

describe('useAgentFees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch fees and update state', async () => {
    const mockFees = [
      { _id: '1', gcomp_cost: 6, agent_known_fee: 10, agent_fee: 10, game_company_id: 'C1', game_main_cate_id: 'M1' }
    ];
    vi.mocked(api.listAgentFees).mockResolvedValueOnce({
      data: mockFees as unknown as AgentFee[],
      total: 1
    });

    const { result } = renderHook(() => useAgentFees('agent123'));
    
    await act(async () => {
      await result.current.fetchFees();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.fees).toEqual(mockFees);
    expect(result.current.total).toBe(1);
    expect(api.listAgentFees).toHaveBeenCalledWith('agent123', { page: 1, limit: 100 }, undefined);
  });

  it('should fetch master data', async () => {
    const mockCompanies = [{ _id: 'c1', name: { en: 'Comp 1' } }];
    const mockCategories = [{ _id: 'cat1', name: { en: 'Cat 1' } }];
    
    vi.mocked(api.getGameCompanies).mockResolvedValueOnce(mockCompanies as unknown as GameCompany[]);
    vi.mocked(api.getGameCategories).mockResolvedValueOnce(mockCategories as unknown as GameCategory[]);

    const { result } = renderHook(() => useAgentFees('agent123'));
    
    await act(async () => {
      await result.current.fetchMasterData();
    });

    expect(result.current.companies).toEqual(mockCompanies);
    expect(result.current.categories).toEqual(mockCategories);
  });
});
