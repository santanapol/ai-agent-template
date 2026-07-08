import { describe, expect, it } from "vitest";

import { getDashboardShortcuts } from "./dashboardShortcuts";

describe("getDashboardShortcuts", () => {
  it("returns staff shortcuts with profile first", () => {
    const shortcuts = getDashboardShortcuts("staff", ["reports:smart"]);
    expect(shortcuts[0]).toEqual({ label: "My Profile", href: "/profile" });
    expect(shortcuts).toContainEqual({ label: "Smart Reports", href: "/smart-reports" });
  });

  it("returns admin shortcuts based on permissions", () => {
    const shortcuts = getDashboardShortcuts("platform_admin", ["profiles:list", "invoices:list", "agents:list"]);
    expect(shortcuts).toEqual([
      { label: "Staff Management", href: "/staff" },
      { label: "Invoices", href: "/invoices" },
      { label: "Agents", href: "/agents" },
    ]);
  });

  it("includes channel performance for branch_admin when permitted", () => {
    const shortcuts = getDashboardShortcuts("branch_admin", [
      "profiles:list",
      "branch-report:marketing:channel-performance:read",
    ]);
    expect(shortcuts).toContainEqual({
      label: "Channel Performance",
      href: "/branch-report/marketing/channel-performance",
    });
  });
});
