// Keep in sync with App.tsx children routes

export interface RouteGuardEntry {
  /** <Route path="..."> in mini-router — sync with App.tsx children */
  routePath: string;
  /** URL for MemoryRouter initialEntries / navigate */
  navigateTo: string;
  permission: string;
  stubTestId: string;
}

export const ROUTE_GUARD_MATRIX: RouteGuardEntry[] = [
  {
    routePath: "index",
    navigateTo: "/",
    permission: "dashboard:view",
    stubTestId: "dashboard-page",
  },
  {
    routePath: "profile",
    navigateTo: "/profile",
    permission: "my_profile",
    stubTestId: "profile-page",
  },
  {
    routePath: "invoices",
    navigateTo: "/invoices",
    permission: "invoices:list",
    stubTestId: "invoices-page",
  },
  {
    routePath: "invoices/:id",
    navigateTo: "/invoices/invoice-1",
    permission: "invoices:read",
    stubTestId: "invoice-detail-page",
  },
  {
    routePath: "agents",
    navigateTo: "/agents",
    permission: "agents:list",
    stubTestId: "agents-page",
  },
  {
    routePath: "agents/:id/fees",
    navigateTo: "/agents/agent-1/fees",
    permission: "agents:fees",
    stubTestId: "agent-fees-page",
  },
  {
    routePath: "staff",
    navigateTo: "/staff",
    permission: "profiles:list",
    stubTestId: "staff-page",
  },
  {
    routePath: "staff/new",
    navigateTo: "/staff/new",
    permission: "profiles:create",
    stubTestId: "staff-create-page",
  },
  {
    routePath: "staff/:id",
    navigateTo: "/staff/profile-1",
    permission: "profiles:list",
    stubTestId: "staff-detail-page",
  },
  {
    routePath: "staff/:id/edit",
    navigateTo: "/staff/profile-1/edit",
    permission: "profiles:edit",
    stubTestId: "staff-edit-page",
  },
  {
    routePath: "smart-reports",
    navigateTo: "/smart-reports",
    permission: "reports:smart",
    stubTestId: "smart-reports-page",
  },
  {
    routePath: "smart-reports/new",
    navigateTo: "/smart-reports/new",
    permission: "reports:smart",
    stubTestId: "smart-reports-new-page",
  },
  {
    routePath: "smart-reports/:id/edit",
    navigateTo: "/smart-reports/report-1/edit",
    permission: "reports:smart",
    stubTestId: "smart-reports-edit-page",
  },
  {
    routePath: "branch-report/marketing/channel-performance",
    navigateTo: "/branch-report/marketing/channel-performance",
    permission: "branch-report:marketing:channel-performance:read",
    stubTestId: "channel-performance-page",
  },
  {
    routePath: "permissions",
    navigateTo: "/permissions",
    permission: "permissions:manage",
    stubTestId: "permissions-page",
  },
];
