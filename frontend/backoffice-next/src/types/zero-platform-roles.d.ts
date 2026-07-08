declare module "@zero-platform/roles" {
  export const VALID_ROLES: readonly string[];
  export const ADMIN_ROLES: readonly string[];
  export const OU_WIDE_STAFF_ROLES: ReadonlySet<string>;
  export const BRANCH_SWITCH_ROLES: ReadonlySet<string>;

  export function canSwitchActiveBranchRole(role: unknown): boolean;
  export function isValidRole(role: unknown): boolean;
  export function isAdminRole(role: unknown): boolean;
}
