import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Code2,
  DollarSign,
  LayoutDashboard,
  LineChart,
  Settings,
  ShieldCheck,
  Store,
  User,
  Users,
  WalletCards,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import { SiteHeader } from '@/components/layout/site-header';
import {
  flattenMenuToTwoLevels,
  resolveSidebarBreadcrumb,
  type MenuItemType,
} from '@/components/layout/types';
import { PageBreadcrumbProvider } from '@/contexts/PageBreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { apiErrorMessage } from '@/lib/apiError';
import * as authApi from '@/lib/authApiClient';
import {
  canSwitchActiveBranch,
  findInvoiceAgentBranch,
  formatActiveBranchLabel,
  formatBranchOptionLabel,
  getCachedInvoiceAgentBranches,
  getCachedMyBranch,
  mergePlatformBranches,
  setCachedInvoiceAgentBranches,
  setCachedMyBranch,
  upsertBranchInList,
} from '@/lib/branchOptions';
import * as invoicesApi from '@/lib/invoicesApiClient';
import { subscribeProfileRefresh } from '@/lib/profileRefresh';
import * as staffApi from '@/lib/staffApiClient';
import type { InvoiceAgentBranch } from '@/types/invoice';
import { useIsMobile } from '@/hooks/use-mobile';

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  branch_admin: 'Branch Admin',
  support_admin: 'Support Admin',
  support: 'Support',
  staff: 'Staff',
};

function formatRoleLabel(role: string | undefined): string {
  if (!role) return '—';
  return (
    ROLE_LABELS[role] ??
    role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const SIDEBAR_EXCLUDED_MENU_KEYS = new Set(['my_profile']);

const MENU_ENTRIES: Record<string, { icon: React.ReactNode; route?: string }> = {
  dashboard: { icon: <LayoutDashboard />, route: '/' },
  'dashboard:view': { icon: <LayoutDashboard />, route: '/' },
  staff: { icon: <Users /> },
  'profiles:list': { icon: <Users />, route: '/staff' },
  billing: { icon: <WalletCards /> },
  'agents:list': { icon: <Store />, route: '/agents' },
  'invoices:list': { icon: <DollarSign />, route: '/invoices' },
  reports: { icon: <Code2 /> },
  'reports:smart': { icon: <BarChart3 />, route: '/smart-reports' },
  'branch-report': { icon: <LineChart /> },
  'branch-report:marketing': { icon: <LineChart /> },
  'branch-report:marketing:channel-performance:read': {
    icon: <LineChart />,
    route: '/branch-report/marketing/channel-performance',
  },
  my_profile: { icon: <User />, route: '/profile' },
  settings: { icon: <Settings /> },
  'permissions:manage': { icon: <ShieldCheck />, route: '/permissions' },
};

function MobileNavSheet({
  open,
  onOpenChange,
  menuTree,
  selectedPath,
  onNavigate,
  branchSwitcherProps,
  navUserProps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuTree: MenuItemType[];
  selectedPath: string;
  onNavigate: (route: string) => void;
  branchSwitcherProps: React.ComponentProps<typeof BranchSwitcher>;
  navUserProps: React.ComponentProps<typeof NavUser>;
}) {
  const handleNavigate = (route: string) => {
    onNavigate(route);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
          <div className="p-2">
            <BranchSwitcher {...branchSwitcherProps} />
          </div>
          <div className="flex-1 overflow-auto p-2">
            <NavMain items={menuTree} selectedPath={selectedPath} onNavigate={handleNavigate} />
          </div>
          <div className="border-t border-sidebar-border p-2">
            <NavUser {...navUserProps} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme: currentTheme, toggleTheme } = useTheme();
  const { user, logout, switchBranch, branchSwitching, menus, menuError } = useAuth();
  const { message } = useAppFeedback();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [headerProfile, setHeaderProfile] = useState<{
    firstname: string;
    lastname: string;
    username: string;
  } | null>(null);
  const [branches, setBranches] = useState<InvoiceAgentBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [activeBranch, setActiveBranch] = useState<InvoiceAgentBranch | null>(() =>
    getCachedMyBranch(user?.branch_id),
  );
  const [activeBranchLoading, setActiveBranchLoading] = useState(false);
  const [optimisticBranchId, setOptimisticBranchId] = useState<string | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const showBranchSwitcher = canSwitchActiveBranch(user?.role);
  const homeBranchId = user?.home_branch_id ?? user?.branch_id;
  const activeBranchId = optimisticBranchId ?? user?.branch_id;
  const viewingOtherBranch =
    Boolean(user?.home_branch_id) && activeBranchId !== user?.home_branch_id;
  const roleLabel = formatRoleLabel(user?.role);

  const handleBranchSwitch = useCallback(
    async (branchId: string) => {
      if (branchSwitching || branchId === activeBranchId) return;
      const target = findInvoiceAgentBranch(branches, branchId);
      const label = target ? formatBranchOptionLabel(target) : branchId;
      setOptimisticBranchId(branchId);
      try {
        await switchBranch(branchId);
        setOptimisticBranchId(null);
        message.success(`Switched to ${label}`);
      } catch (err: unknown) {
        setOptimisticBranchId(null);
        message.error(apiErrorMessage(err, 'Could not switch branch'));
      }
    },
    [switchBranch, message, branches, activeBranchId, branchSwitching],
  );

  useEffect(() => subscribeProfileRefresh(() => setProfileRefreshKey((k) => k + 1)), []);

  useEffect(() => {
    if (!user?.sub) return;
    let cancelled = false;
    staffApi
      .getProfileByUserId(user.sub)
      .then(({ profile }) => {
        if (cancelled) return;
        const fullName = `${profile.firstname} ${profile.lastname}`.trim();
        setHeaderProfile({
          firstname: profile.firstname,
          lastname: profile.lastname,
          username: profile.user.username,
        });
        setDisplayName(fullName || profile.user.username);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayName(null);
          setHeaderProfile(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.sub, profileRefreshKey]);

  useEffect(() => {
    if (!user?.sub || !user.branch_id) {
      setActiveBranch(null);
      setActiveBranchLoading(false);
      return;
    }
    let cancelled = false;
    const cached = getCachedMyBranch(user.branch_id);
    if (cached) {
      setActiveBranch(cached);
      setActiveBranchLoading(false);
    } else {
      setActiveBranchLoading(true);
    }
    authApi
      .getMyBranch()
      .then((branch) => {
        if (cancelled) return;
        setCachedMyBranch(branch);
        setActiveBranch(branch);
      })
      .catch(() => {
        if (!cancelled && !cached) setActiveBranch(null);
      })
      .finally(() => {
        if (!cancelled) setActiveBranchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.sub, user?.branch_id]);

  useEffect(() => {
    if (!user?.sub || !showBranchSwitcher) {
      setBranches([]);
      setBranchesLoading(false);
      return;
    }
    let cancelled = false;
    const cached = getCachedInvoiceAgentBranches(user.ou_id);
    if (cached) {
      setBranches(mergePlatformBranches(cached));
      setBranchesLoading(false);
    } else {
      setBranchesLoading(true);
    }
    const loadSwitcherBranches = async () => {
      let list: InvoiceAgentBranch[] = cached ?? [];
      try {
        const res = await invoicesApi.listInvoiceAgents();
        list = res.data;
      } catch {
        // Switcher still works with active branch only when invoice service is down.
      }
      if (activeBranch) list = upsertBranchInList(list, activeBranch);
      if (cancelled) return;
      const sorted = mergePlatformBranches(list);
      if (user.ou_id) setCachedInvoiceAgentBranches(user.ou_id, sorted);
      setBranches(sorted);
      setBranchesLoading(false);
    };
    void loadSwitcherBranches();
    return () => {
      cancelled = true;
    };
  }, [user?.sub, user?.ou_id, showBranchSwitcher, activeBranch]);

  const branchDisplayLabel = formatActiveBranchLabel(
    activeBranch,
    user?.branch_id,
    activeBranchLoading,
  );

  const menuTree = useMemo(() => {
    const itemMap = new Map<string, { item: MenuItemType; parentKey: string | null }>();
    menus.forEach((node) => {
      if (SIDEBAR_EXCLUDED_MENU_KEYS.has(node.key)) return;
      const ui = MENU_ENTRIES[node.key];
      if (!ui) return;
      const item: MenuItemType = {
        key: ui.route || node.key,
        label: node.label,
        icon: ui.icon,
        route: ui.route,
        sort_order: node.sort_order,
      };
      itemMap.set(node.key, { item, parentKey: node.parent_key });
    });
    const rootItems: MenuItemType[] = [];
    itemMap.forEach((val) => {
      const { item, parentKey } = val;
      if (parentKey && itemMap.has(parentKey)) {
        const parentVal = itemMap.get(parentKey)!;
        if (!parentVal.item.children) parentVal.item.children = [];
        parentVal.item.children.push(item);
      } else {
        rootItems.push(item);
      }
    });
    const sortItems = (items: MenuItemType[], depth = 0) => {
      if (depth > 5) {
        console.warn('Menu structure exceeded maximum depth or contains a cycle');
        return;
      }
      items.sort((a, b) => a.sort_order - b.sort_order);
      items.forEach((i) => i.children && sortItems(i.children, depth + 1));
    };
    sortItems(rootItems);
    return flattenMenuToTwoLevels(rootItems);
  }, [menus]);

  const branchSelectLoading =
    branchSwitching || (showBranchSwitcher && branchesLoading && branches.length === 0);

  const activeBranchSelectLabel = useMemo(() => {
    const match = branches.find((b) => b.branch_id === activeBranchId);
    if (match) return formatBranchOptionLabel(match);
    if (activeBranch && activeBranch.branch_id === activeBranchId) {
      return formatBranchOptionLabel(activeBranch);
    }
    return branchDisplayLabel;
  }, [branches, activeBranchId, activeBranch, branchDisplayLabel]);

  const breadcrumb = useMemo(
    () => resolveSidebarBreadcrumb(menuTree, location.pathname),
    [menuTree, location.pathname],
  );

  const handleNavigate = (route: string) => navigate(route);

  const branchSwitcherProps = {
    showBranchSwitcher,
    branchDisplayLabel,
    activeBranchId,
    activeBranchSelectLabel,
    branches,
    branchSelectLoading,
    viewingOtherBranch,
    homeBranchId,
    onBranchSwitch: (branchId: string) => void handleBranchSwitch(branchId),
    roleLabel,
  };

  const navUserProps = {
    displayName,
    headerProfile,
    user,
    roleLabel,
    currentTheme,
    onToggleTheme: toggleTheme,
    onProfile: () => navigate('/profile'),
    onLogout: () => {
      void logout().then(() => navigate('/login'));
    },
  };

  const sidebarProps = {
    menuTree,
    selectedPath: location.pathname,
    onNavigate: handleNavigate,
    ...branchSwitcherProps,
    ...navUserProps,
  };

  return (
    <>
      {!isMobile ? <AppSidebar {...sidebarProps} /> : null}

      <MobileNavSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        menuTree={menuTree}
        selectedPath={location.pathname}
        onNavigate={handleNavigate}
        branchSwitcherProps={branchSwitcherProps}
        navUserProps={navUserProps}
      />

      <SidebarInset>
        <PageBreadcrumbProvider baseBreadcrumb={breadcrumb}>
          {(headerBreadcrumb) => (
            <>
              <SiteHeader
                breadcrumb={headerBreadcrumb}
                isMobile={isMobile}
                onOpenMobileNav={() => setMobileNavOpen(true)}
                mobileBranchLabel={
                  isMobile
                    ? showBranchSwitcher
                      ? activeBranchSelectLabel
                      : branchDisplayLabel
                    : null
                }
              />

              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {menuError ? (
                  <Alert variant="destructive">
                    <AlertTitle>System warning</AlertTitle>
                    <AlertDescription>
                      Some menu items are temporarily unavailable. Please try refreshing the page or logging in again.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Outlet key={user?.branch_id ?? 'guest'} />
              </div>
            </>
          )}
        </PageBreadcrumbProvider>
      </SidebarInset>
    </>
  );
};

function AdminLayoutShell() {
  return (
    <SidebarProvider>
      <AdminLayout />
    </SidebarProvider>
  );
}

export default AdminLayoutShell;
