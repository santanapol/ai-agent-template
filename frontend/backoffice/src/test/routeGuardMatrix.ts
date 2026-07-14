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
    routePath: 'index',
    navigateTo: '/',
    permission: 'dashboard:view',
    stubTestId: 'dashboard-page',
  },
  {
    routePath: 'profile',
    navigateTo: '/profile',
    permission: 'my_profile',
    stubTestId: 'profile-page',
  },
  {
    routePath: 'invoices',
    navigateTo: '/invoices',
    permission: 'invoices:list',
    stubTestId: 'invoices-page',
  },
  {
    routePath: 'invoices/:id',
    navigateTo: '/invoices/invoice-1',
    permission: 'invoices:read',
    stubTestId: 'invoice-detail-page',
  },
  {
    routePath: 'agents',
    navigateTo: '/agents',
    permission: 'agents:list',
    stubTestId: 'agents-page',
  },
  {
    routePath: 'agents/:id/fees',
    navigateTo: '/agents/agent-1/fees',
    permission: 'agents:fees',
    stubTestId: 'agent-fees-page',
  },
  {
    routePath: 'staff',
    navigateTo: '/staff',
    permission: 'profiles:list',
    stubTestId: 'staff-page',
  },
  {
    routePath: 'smart-reports',
    navigateTo: '/smart-reports',
    permission: 'reports:smart',
    stubTestId: 'smart-reports-page',
  },
  {
    routePath: 'branch-report/channel-performance',
    navigateTo: '/branch-report/channel-performance',
    permission: 'branch-report:marketing:channel-performance:read',
    stubTestId: 'channel-performance-page',
  },
  {
    routePath: 'permissions',
    navigateTo: '/permissions',
    permission: 'permissions:manage',
    stubTestId: 'permissions-page',
  },
];
