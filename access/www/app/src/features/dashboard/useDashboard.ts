import { useCallback, useState } from "react";
import { apiRequest, type SessionHeaders } from "../../lib/api";

type DashboardSummary = {
  visibility: "full" | "limited";
  refreshedAt: string;
  widgets: Record<string, unknown>;
};

type Envelope<T> = {
  data: T;
};

export function useDashboard(scope: {
  ouId: string;
  branchId: string;
  headers: SessionHeaders;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Envelope<DashboardSummary>>(
        `/api/v1/ou/${scope.ouId}/branches/${scope.branchId}/dashboard/summary`,
        scope.headers,
        { method: "GET" },
      );
      setSummary(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [scope.branchId, scope.headers, scope.ouId]);

  return {
    summary,
    loading,
    error,
    load,
  };
}
