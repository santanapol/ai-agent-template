const BRANCH_TYPE_LABELS: Record<string, string> = {
  MA: "Master agent",
  AG: "Agent",
};

export function formatAgentBranchTypeLabel(branchType: string): string {
  return BRANCH_TYPE_LABELS[branchType] ?? branchType;
}

export function formatAgentCurrency(currency: string | null | undefined): string {
  const code = currency?.trim();
  if (!code) return "—";
  return code.toUpperCase();
}
