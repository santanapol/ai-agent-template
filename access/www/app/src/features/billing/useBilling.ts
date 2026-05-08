import { useCallback, useState } from "react";
import { apiRequest, type SessionHeaders } from "../../lib/api";

type BillingPlan = {
  planCode: string;
  status: string;
  updatedAt: string;
};

type Invoice = {
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
  dueAt: string;
};

type Envelope<T> = {
  data: T;
};

export function useBilling(scope: {
  ouId: string;
  branchId: string;
  headers: SessionHeaders;
}) {
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/v1/ou/${scope.ouId}/branches/${scope.branchId}/billing`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planRes, invoicesRes] = await Promise.all([
        apiRequest<Envelope<BillingPlan>>(`${base}/plan`, scope.headers, {
          method: "GET",
        }),
        apiRequest<Envelope<Invoice[]>>(`${base}/invoices`, scope.headers, {
          method: "GET",
        }),
      ]);
      setPlan(planRes.data);
      setInvoices(invoicesRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [base, scope.headers]);

  const updatePlan = useCallback(
    async (planCode: string) => {
      await apiRequest(`${base}/plan`, scope.headers, {
        method: "PATCH",
        body: JSON.stringify({ planCode }),
      });
      await load();
    },
    [base, load, scope.headers],
  );

  return {
    plan,
    invoices,
    loading,
    error,
    load,
    updatePlan,
  };
}
