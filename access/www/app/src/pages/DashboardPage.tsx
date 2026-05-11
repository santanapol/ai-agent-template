import { useEffect } from "react";
import { useAuth } from "../app/use-auth";
import { useSessionApiHeaders } from "../app/use-session-api-headers";
import { useDashboard } from "../features/dashboard/useDashboard";

export function DashboardPage() {
  const { session } = useAuth();
  const apiHeaders = useSessionApiHeaders(session);
  const { summary, loading, error, load } = useDashboard({
    ouId: session.ouId,
    branchId: session.branchId,
    headers: apiHeaders,
  });

  useEffect(() => {
    void load();
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
