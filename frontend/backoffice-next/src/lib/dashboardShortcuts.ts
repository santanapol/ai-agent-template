import { anyPermissionMatches } from "@/lib/permissionMatch";

export type DashboardShortcut = {
  label: string;
  href: string;
};

const ROUTE_SHORTCUTS = [
  { permission: "profiles:list", label: "Staff Management", href: "/staff" },
  { permission: "invoices:list", label: "Invoices", href: "/invoices" },
  { permission: "agents:list", label: "Agents", href: "/agents" },
  {
    permission: "branch-report:marketing:channel-performance:read",
    label: "Channel Performance",
    href: "/branch-report/marketing/channel-performance",
  },
  { permission: "reports:smart", label: "Smart Reports", href: "/smart-reports" },
  { permission: "permissions:manage", label: "Permissions", href: "/permissions" },
] as const;

export function getDashboardShortcuts(role: string | undefined, permissions: string[]): DashboardShortcut[] {
  const has = (key: string) => anyPermissionMatches(permissions, key);
  const permitted = ROUTE_SHORTCUTS.filter((item) => has(item.permission)).map(({ label, href }) => ({ label, href }));

  if (role === "staff") {
    return [{ label: "My Profile", href: "/profile" }, ...permitted];
  }

  return permitted;
}
