import type { UserRole } from "./auth-context";

const MEMBER_MANAGE_ROLES: UserRole[] = ["owner", "admin", "manager"];
const OU_LEVEL_ROLES: UserRole[] = ["owner", "admin"];

export function canManageMembers(role: UserRole) {
  return MEMBER_MANAGE_ROLES.includes(role);
}

export function isOuLevelRole(role: UserRole) {
  return OU_LEVEL_ROLES.includes(role);
}
