import type { InvoiceAgentBranch } from "@/types/invoice";

export type AuthBranchRow = InvoiceAgentBranch;

export type BranchCatalogFetcher = () => Promise<InvoiceAgentBranch[]>;

interface CacheEntry {
  branches: InvoiceAgentBranch[];
}

const cacheByKey = new Map<string, CacheEntry>();
const inflightByKey = new Map<string, Promise<InvoiceAgentBranch[]>>();

/** Map auth branch rows to invoice dropdown shape (fields align today). */
export function authBranchToInvoiceBranch(branch: AuthBranchRow): InvoiceAgentBranch {
  return {
    branch_id: branch.branch_id,
    branch_code: branch.branch_code ?? null,
    branch_name: branch.branch_name ?? null,
    active: branch.active,
  };
}

export function authBranchesToInvoiceBranches(branches: AuthBranchRow[]): InvoiceAgentBranch[] {
  return branches.map(authBranchToInvoiceBranch);
}

export function branchCatalogCacheKey(ouId: string, source: "auth" | "invoice-agent" = "auth"): string {
  return `${source}:${ouId}`;
}

export function invalidateBranchCatalog(ouId?: string): void {
  if (!ouId) {
    cacheByKey.clear();
    inflightByKey.clear();
    return;
  }
  const authKey = branchCatalogCacheKey(ouId, "auth");
  const agentKey = branchCatalogCacheKey(ouId, "invoice-agent");
  const authPrefix = `${authKey}:`;
  for (const key of [...cacheByKey.keys()]) {
    if (key === authKey || key === agentKey || key.startsWith(authPrefix)) {
      cacheByKey.delete(key);
      inflightByKey.delete(key);
    }
  }
}

/**
 * Session-scoped in-memory catalog with single-flight dedupe per cache key.
 */
export function peekBranchCatalog(cacheKey: string): InvoiceAgentBranch[] | null {
  return cacheByKey.get(cacheKey)?.branches ?? null;
}

export async function getBranchCatalog(cacheKey: string, fetcher: BranchCatalogFetcher): Promise<InvoiceAgentBranch[]> {
  const cached = cacheByKey.get(cacheKey);
  if (cached) return cached.branches;

  const inflight = inflightByKey.get(cacheKey);
  if (inflight) return inflight;

  const promise = fetcher()
    .then((branches) => {
      cacheByKey.set(cacheKey, { branches });
      return branches;
    })
    .finally(() => {
      inflightByKey.delete(cacheKey);
    });

  inflightByKey.set(cacheKey, promise);
  return promise;
}

/** @internal test helper */
export function clearBranchCatalogCacheForTests(): void {
  cacheByKey.clear();
  inflightByKey.clear();
}
