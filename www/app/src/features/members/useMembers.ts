import { useCallback, useState } from "react";
import { apiRequest, type SessionHeaders } from "../../lib/api";

export type Member = {
  userId: string;
  username: string;
  displayName: string;
  email: string | null;
  role: "manager" | "member" | "billing";
  status: "active" | "suspended";
};

type Envelope<T> = {
  data: T;
};

type CreateMemberPayload = {
  username: string;
  password: string;
  displayName: string;
  email: string;
  role: Member["role"];
  status: Member["status"];
};

type PatchMemberPayload = {
  displayName?: string;
  email?: string;
  role?: Member["role"];
  status?: Member["status"];
  password?: string;
};

export function useMembers(scope: {
  ouId: string;
  branchId: string;
  headers: SessionHeaders;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeBase = "/api/v1/members";

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Envelope<Member[]>>(routeBase, scope.headers, {
        method: "GET",
      });
      setMembers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [routeBase, scope.headers]);

  const createMember = useCallback(
    async (payload: CreateMemberPayload) => {
      await apiRequest(routeBase, scope.headers, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await fetchMembers();
    },
    [fetchMembers, routeBase, scope.headers],
  );

  const patchMember = useCallback(
    async (userId: string, payload: PatchMemberPayload) => {
      await apiRequest(`${routeBase}/${userId}`, scope.headers, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await fetchMembers();
    },
    [fetchMembers, routeBase, scope.headers],
  );

  const removeMember = useCallback(
    async (userId: string) => {
      await apiRequest(`${routeBase}/${userId}`, scope.headers, {
        method: "DELETE",
      });
      await fetchMembers();
    },
    [fetchMembers, routeBase, scope.headers],
  );

  return {
    members,
    loading,
    error,
    fetchMembers,
    createMember,
    patchMember,
    removeMember,
  };
}
