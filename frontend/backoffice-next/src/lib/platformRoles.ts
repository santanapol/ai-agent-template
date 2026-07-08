/** Mirror of backend/shared/platform-roles — keep in sync with auth role enum. */

export const OU_WIDE_STAFF_ROLES = new Set(["platform_admin", "support_admin", "support"]);

export function canSwitchActiveBranchRole(role: unknown): boolean {
  return typeof role === "string" && OU_WIDE_STAFF_ROLES.has(role);
}
