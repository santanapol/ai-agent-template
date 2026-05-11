import { useCallback, useRef, useState } from "react";
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
  const loadInvocation = useRef(0);

  const load = useCallback(async () => {
    loadInvocation.current += 1;
    // #region agent log
    fetch("http://127.0.0.1:7873/ingest/e25c6966-fe95-43b5-a10f-c2d30ea4e4a5", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6021c2",
      },
      body: JSON.stringify({
        sessionId: "6021c2",
        location: "useDashboard.ts:load",
        message: "load() invoked",
        data: {
          invocation: loadInvocation.current,
          ouId: scope.ouId,
          branchId: scope.branchId,
          hasBearer: Boolean(
            scope.headers?.accessToken &&
              String(scope.headers.accessToken).trim(),
          ),
        },
        timestamp: Date.now(),
        hypothesisId: "B",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
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
