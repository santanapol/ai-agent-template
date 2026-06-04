import { useState, useCallback } from 'react';
import { message } from 'antd';
import * as api from '../../../lib/agentFeesApiClient';
import type { AgentFee, GameCompany, GameCategory, ListFeesParams } from '../../../types/agentFees';

export function useAgentFees(agentId: string) {
  const [fees, setFees] = useState<AgentFee[]>([]);
  const [companies, setCompanies] = useState<GameCompany[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchFees = useCallback(async (params: ListFeesParams = { page: 1, limit: 1000 }) => {
    if (!agentId) return;
    setLoading(true);
    try {
      const data = await api.listAgentFees(agentId, params);
      setFees(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch agent fees');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [comps, cats] = await Promise.all([
        api.getGameCompanies(),
        api.getGameCategories()
      ]);
      setCompanies(comps || []);
      setCategories(cats || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch master data');
    }
  }, []);

  const createFee = useCallback(async (payload: any) => {
    if (!agentId) return false;
    setLoading(true);
    try {
      await api.createAgentFee(agentId, payload);
      message.success('Fee created successfully');
      return true;
    } catch (err: any) {
      if (err.response?.status === 409) {
        message.error('Fee override for this company and category already exists.');
      } else {
        message.error(err.response?.data?.message || 'Failed to create agent fee');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const updateFee = useCallback(async (feeId: string, payload: any, etag: string) => {
    if (!agentId) return false;
    setLoading(true);
    try {
      await api.updateAgentFee(agentId, feeId, payload, etag);
      message.success('Fee updated successfully');
      return true;
    } catch (err: any) {
      if (err.response?.status === 412) {
        message.warning('This record was modified by someone else. Please refresh and try again.');
      } else {
        message.error(err.response?.data?.message || 'Failed to update fee');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const deleteFee = useCallback(async (feeId: string, etag: string) => {
    if (!agentId) return false;
    setLoading(true);
    try {
      await api.deleteAgentFee(agentId, feeId, etag);
      message.success('Fee deleted successfully');
      return true;
    } catch (err: any) {
      if (err.response?.status === 412) {
        message.warning('This record was modified by someone else. Please refresh and try again.');
      } else {
        message.error(err.response?.data?.message || 'Failed to delete fee');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const bulkSave = useCallback(async (
    creates: any[],
    updates: { id: string; payload: any; etag: string }[],
    deletes: { id: string; etag: string }[]
  ) => {
    if (!agentId) return false;
    setLoading(true);
    try {
      const promises: Promise<any>[] = [];
      
      creates.forEach(c => promises.push(api.createAgentFee(agentId, c)));
      updates.forEach(u => promises.push(api.updateAgentFee(agentId, u.id, u.payload, u.etag)));
      deletes.forEach(d => promises.push(api.deleteAgentFee(agentId, d.id, d.etag)));
      
      await Promise.all(promises);
      message.success('All fee updates saved successfully');
      return true;
    } catch (err: any) {
      if (err.response?.status === 412) {
        message.warning('Some records were modified by someone else. Please refresh and try again.');
      } else {
        message.error(err.response?.data?.message || 'Failed to save fee updates');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  return {
    fees,
    companies,
    categories,
    loading,
    total,
    fetchFees,
    fetchMasterData,
    createFee,
    updateFee,
    deleteFee,
    bulkSave
  };
}
