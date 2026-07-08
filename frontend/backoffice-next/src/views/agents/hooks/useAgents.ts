import { useCallback, useState } from "react";

import { toast } from "sonner";

import * as api from "../../../lib/agentsApiClient";
import type { Agent, ListAgentsParams, UpdateAgentPayload } from "../../../types/agents";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [unsyncedBranches, setUnsyncedBranches] = useState<
    { branch_id: string; branch_code: string; branch_name: string; active: boolean }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingUnsynced, setLoadingUnsynced] = useState(false);

  const fetchAgents = useCallback(async (params: ListAgentsParams = {}) => {
    setLoading(true);
    try {
      const data = await api.listAgents(params);
      setAgents(data.data);
      if (data.total !== undefined) setTotal(data.total);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnsyncedBranches = useCallback(async (includeInactive = false) => {
    setLoadingUnsynced(true);
    try {
      const data = await api.listUnsyncedBranches(includeInactive);
      setUnsyncedBranches(data.data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to fetch unsynced branches");
    } finally {
      setLoadingUnsynced(false);
    }
  }, []);

  const syncData = useCallback(async (branchId: string) => {
    setLoading(true);
    try {
      await api.syncAgent(branchId);
      toast.success("Agent synchronized successfully");
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to sync agent");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateData = useCallback(async (id: string, payload: UpdateAgentPayload, dateISO: string) => {
    setLoading(true);
    try {
      await api.updateAgent(id, payload, dateISO);
      toast.success("Agent updated successfully");
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to update agent");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteData = useCallback(async (id: string, dateISO: string) => {
    setLoading(true);
    try {
      await api.softDeleteAgent(id, dateISO);
      toast.success("Agent deleted successfully");
      return true;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to delete agent");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    agents,
    unsyncedBranches,
    total,
    loading,
    loadingUnsynced,
    fetchAgents,
    fetchUnsyncedBranches,
    syncData,
    updateData,
    deleteData,
  };
}
