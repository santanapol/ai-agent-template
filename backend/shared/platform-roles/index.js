/**
 * Canonical platform roles — keep in sync with auth `setRoleBodySchema` / OpenAPI role enum.
 * Downstream mesh services and auth should import from here instead of duplicating lists.
 */
export const VALID_ROLES = Object.freeze([
  "platform_admin",
  "branch_admin",
  "staff",
  "support",
  "support_admin",
]);

export const VALID_ROLES_SET = new Set(VALID_ROLES);

/** Roles that may perform admin lifecycle actions (subset of VALID_ROLES). */
export const ADMIN_ROLES = Object.freeze([
  "platform_admin",
  "branch_admin",
  "support_admin",
  "support",
]);

const ADMIN_ROLES_SET = new Set(ADMIN_ROLES);

/** OU-wide staff scope (no branch pin) — platform_admin, support, support_admin. */
export const OU_WIDE_STAFF_ROLES = new Set([
  "platform_admin",
  "support_admin",
  "support",
]);

/** Roles allowed to call POST /auth/me/active-branch. */
export const BRANCH_SWITCH_ROLES = OU_WIDE_STAFF_ROLES;

/**
 * @param {unknown} role
 * @returns {boolean}
 */
export function canSwitchActiveBranchRole(role) {
  return typeof role === "string" && BRANCH_SWITCH_ROLES.has(role);
}
export function isValidRole(role) {
  return typeof role === "string" && VALID_ROLES_SET.has(role);
}

/**
 * @param {unknown} role
 * @returns {boolean}
 */
export function isAdminRole(role) {
  return typeof role === "string" && ADMIN_ROLES_SET.has(role);
}
