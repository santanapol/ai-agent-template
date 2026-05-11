import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../app/use-auth";
import { useDashboard } from "../features/dashboard/useDashboard";
import { sessionToApiHeaders } from "../lib/api";

export function DashboardPage() {
  const { session } = useAuth();
  const effectRun = useRef(0);
  const apiHeaders = useMemo(() => sessionToApiHeaders(session), [session]);
  const { summary, loading, error, load } = useDashboard({
    ouId: session.ouId,
    branchId: session.branchId,
    headers: apiHeaders,
  });

  useEffect(() => {
    effectRun.current += 1;
    // #region agent log
    fetch("http://127.0.0.1:7873/ingest/e25c6966-fe95-43b5-a10f-c2d30ea4e4a5", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6021c2",
      },
      body: JSON.stringify({
        sessionId: "6021c2",
        location: "DashboardPage.tsx:useEffect",
        message: "useEffect([load]) fired",
        data: {
          effectCount: effectRun.current,
          role: session.role,
        },
        timestamp: Date.now(),
        hypothesisId: "A",
        runId: "post-fix",
      }),
    }).catch(() => {});
    // #endregion
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load reflects memoized headers; avoid effect on every session.role log
  }, [load]);

  return (
    <section>
      <h2>Dashboard</h2>
      <p>Role visibility is enforced by backend and reflected here.</p>
      {loading ? <p>Loading dashboard...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {summary ? (
        <div className="panel">
          <p className="muted">Visibility: {summary.visibility}</p>
          <p className="muted">Refreshed at: {summary.refreshedAt}</p>
          <pre className="json">{JSON.stringify(summary.widgets, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  );
}
