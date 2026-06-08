import { useState, useCallback } from 'react';
import { useAppFeedback } from '../../../hooks/useAppFeedback';
import * as api from '../../../lib/agentFeesApiClient';
import type { AgentFee, GameCompany, GameCategory, ListFeesParams } from '../../../types/agentFees';

export function useAgentFees(agentId: string) {
  const { message } = useAppFeedback();
  const [fees, setFees] = useState<AgentFee[]>([]);
  const [companies, setCompanies] = useState<GameCompany[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchFees = useCallback(async (params: ListFeesParams = { page: 1, limit: 100 }, signal?: AbortSignal) => {
    if (!agentId) return;
    setLoading(true);
    try {
      const data = await api.listAgentFees(agentId, params, signal);
      if (signal?.aborted) return;
      setFees(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      message.error(err.response?.data?.message || 'Failed to fetch agent fees');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [agentId, message]);

  const fetchMasterData = useCallback(async (ou_id?: string, signal?: AbortSignal) => {
    try {
      const [comps, cats] = await Promise.all([
        api.getGameCompanies(ou_id, signal),
        api.getGameCategories(ou_id, signal),
      ]);
      if (signal?.aborted) return;
      setCompanies(comps || []);
      setCategories(cats || []);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      message.error(err.response?.data?.message || 'Failed to fetch master data');
    }
  }, [message]);

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
  }, [agentId, message]);

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
  }, [agentId, message]);

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
  }, [agentId, message]);

  const bulkSave = useCallback(async (
    creates: any[],
    updates: { id: string; payload: any; etag: string }[],
    deletes: { id: string; etag: string }[]
  ) => {
    if (!agentId) return false;
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        ...creates.map(c => api.createAgentFee(agentId, c)),
        ...updates.map(u => api.updateAgentFee(agentId, u.id, u.payload, u.etag)),
        ...deletes.map(d => api.deleteAgentFee(agentId, d.id, d.etag)),
      ];

      const results = await Promise.allSettled(promises);
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      if (failed.length === 0) {
        message.success('All fee updates saved successfully');
        return true;
      }

      const succeeded = results.length - failed.length;
      const has412 = failed.some(r => r.reason?.response?.status === 412);

      if (succeeded > 0) {
        message.warning(
          `${succeeded} of ${results.length} saved. ${failed.length} failed — ${has412 ? 'record(s) modified by someone else, ' : ''}please refresh and retry.`
        );
      } else if (has412) {
        message.warning('Records were modified by someone else. Please refresh and try again.');
      } else {
        message.error(failed[0].reason?.response?.data?.message || 'Failed to save fee updates');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [agentId, message]);

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
