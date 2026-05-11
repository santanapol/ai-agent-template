import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/use-auth";
import { canManageBillingPlan } from "../app/permissions";
import { useBilling } from "../features/billing/useBilling";
import { sessionToApiHeaders } from "../lib/api";

export function BillingPage() {
  const { session } = useAuth();
  const [nextPlanCode, setNextPlanCode] = useState("growth");
  const apiHeaders = useMemo(() => sessionToApiHeaders(session), [session]);
  const { plan, invoices, loading, error, load, updatePlan } = useBilling({
    ouId: session.ouId,
    branchId: session.branchId,
    headers: apiHeaders,
  });

  useEffect(() => {
    void load();
  }, [load]);

  const canManagePlan = canManageBillingPlan(session.role);

  return (
    <section>
      <h2>Billing</h2>
      <p>
        Branch-level billing data with Admin default `billing:manage` behavior.
      </p>
      {loading ? <p>Loading billing...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {plan ? (
        <div className="panel">
          <p>
            Current plan: <strong>{plan.planCode}</strong>
          </p>
          <p className="muted">Status: {plan.status}</p>
          <p className="muted">Updated: {plan.updatedAt}</p>
          {canManagePlan ? (
            <div className="grid one-line">
              <input
                value={nextPlanCode}
                onChange={(event) => setNextPlanCode(event.target.value)}
              />
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void updatePlan(nextPlanCode)}
              >
                Update plan
              </button>
            </div>
          ) : (
            <p className="muted">Read-only for this role.</p>
          )}
        </div>
      ) : null}

      <div className="panel">
        <h3>Invoices</h3>
        {invoices.length === 0 ? <p>No invoices found.</p> : null}
        {invoices.map((invoice) => (
          <div className="member-row" key={invoice.invoiceId}>
            <span>{invoice.invoiceId}</span>
            <span>
              {invoice.amount} {invoice.currency}
            </span>
            <span>{invoice.status}</span>
            <span className="muted">due {invoice.dueAt}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
