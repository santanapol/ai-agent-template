import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Code2,
  DollarSign,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  User,
  Users,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { UserAvatar } from '@/components/UserAvatar';
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

const MENU_ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="size-4" />,
  'dashboard:view': <LayoutDashboard className="size-4" />,
  staff: <Users className="size-4" />,
  'profiles:list': <Users className="size-4" />,
  billing: <DollarSign className="size-4" />,
  'agents:list': <Store className="size-4" />,
  'invoices:list': <DollarSign className="size-4" />,
  reports: <Code2 className="size-4" />,
  'reports:smart': <BarChart3 className="size-4" />,
  'branch-report': <LineChart className="size-4" />,
  'branch-report:marketing': <LineChart className="size-4" />,
  'branch-report:marketing:channel-performance:read': <LineChart className="size-4" />,
  my_profile: <User className="size-4" />,
  settings: <Settings className="size-4" />,
  'permissions:manage': <ShieldCheck className="size-4" />,
};

interface MenuItemUI {
  icon?: React.ReactNode;
  route?: string;
}

const MENU_UI: Record<string, MenuItemUI> = {
  dashboard: { icon: MENU_ICONS.dashboard, route: '/' },
  'dashboard:view': { icon: MENU_ICONS['dashboard:view'], route: '/' },
  staff: { icon: MENU_ICONS.staff },
  'profiles:list': { icon: MENU_ICONS['profiles:list'], route: '/staff' },
  billing: { icon: MENU_ICONS.billing },
  'agents:list': { icon: MENU_ICONS['agents:list'], route: '/agents' },
  'invoices:list': { icon: MENU_ICONS['invoices:list'], route: '/invoices' },
  reports: { icon: MENU_ICONS.reports },
  'reports:smart': { icon: MENU_ICONS['reports:smart'], route: '/smart-reports' },
  'branch-report': { icon: MENU_ICONS['branch-report'] },
  'branch-report:marketing': { icon: MENU_ICONS['branch-report:marketing'] },
  'branch-report:marketing:channel-performance:read': {
    icon: MENU_ICONS['branch-report:marketing:channel-performance:read'],
    route: '/branch-report/marketing/channel-performance',
  },
  my_profile: { icon: MENU_ICONS.my_profile, route: '/profile' },
  settings: { icon: MENU_ICONS.settings },
  'permissions:manage': { icon: MENU_ICONS['permissions:manage'], route: '/permissions' },
};

interface MenuItemType {
  key: string;
  label: string;
  icon?: React.ReactNode;
  route?: string;
  children?: MenuItemType[];
  sort_order: number;
}

function MenuTreeItems({
  items,
  selectedPath,
  onNavigate,
  depth = 0,
}: {
  items: MenuItemType[];
  selectedPath: string;
  onNavigate: (route: string) => void;
  depth?: number;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <>
      {items.map((item) => {
        if (item.children?.length) {
          const isOpen =
            openGroups[item.key] ??
            item.children.some(
              (c) =>
                c.route === selectedPath ||
                (c.children?.some((gc) => gc.route === selectedPath) ?? false),
            );
          const SubMenu = depth === 0 ? SidebarMenuSub : 'div';

          return (
            <Collapsible
              key={item.key}
              open={isOpen}
              onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [item.key]: open }))}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton className={depth > 0 ? 'pl-6' : undefined}>
                      {item.icon}
                      <span>{item.label}</span>
                      <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  }
                />
                <CollapsibleContent>
                  <SubMenu className={depth === 0 ? undefined : 'ml-2 flex flex-col gap-1 border-l pl-2'}>
                    <MenuTreeItems
                      items={item.children}
                      selectedPath={selectedPath}
                      onNavigate={onNavigate}
                      depth={depth + 1}
                    />
                  </SubMenu>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        if (depth === 0) {
          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                isActive={item.route === selectedPath}
                onClick={() => item.route && onNavigate(item.route)}
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuSubItem key={item.key}>
            <SidebarMenuSubButton
              isActive={item.route === selectedPath}
              onClick={() => item.route && onNavigate(item.route)}
            >
              {item.icon}
              <span>{item.label}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </>
  );
}

function AppSidebar({
  menuTree,
  onNavigate,
}: {
  menuTree: MenuItemType[];
  onNavigate: (route: string) => void;
}) {
  const location = useLocation();
  const selectedPath = location.pathname;

  return (
    <SidebarMenu>
      <MenuTreeItems items={menuTree} selectedPath={selectedPath} onNavigate={onNavigate} />
    </SidebarMenu>
  );
}

function MobileNav({
  open,
  onOpenChange,
  menuTree,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuTree: MenuItemType[];
  onNavigate: (route: string) => void;
}) {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle>Zero Platform</SheetTitle>
        </SheetHeader>
        <div className="p-2">
          <SidebarMenu>
            {menuTree.flatMap((item) => {
              const items = item.children?.length ? item.children : [item];
              return items.map((entry) => (
                <SidebarMenuItem key={entry.key}>
                  <SidebarMenuButton
                    isActive={entry.route === location.pathname}
                    onClick={() => {
                      if (entry.route) {
                        onNavigate(entry.route);
                        onOpenChange(false);
                      }
                    }}
                  >
                    {entry.icon}
                    <span>{entry.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ));
            })}
          </SidebarMenu>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
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
      const ui = MENU_UI[node.key];
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
    return rootItems;
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

  const handleNavigate = (route: string) => navigate(route);

  return (
    <>
      {!isMobile ? (
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex h-12 items-center justify-center px-2 group-data-[collapsible=icon]:px-0">
              <span className="truncate text-lg font-bold text-primary group-data-[collapsible=icon]:hidden">
                Zero Platform
              </span>
              <span className="hidden text-lg font-bold text-primary group-data-[collapsible=icon]:inline">
                ZP
              </span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <AppSidebar menuTree={menuTree} onNavigate={handleNavigate} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter />
        </Sidebar>
      ) : (
        <MobileNav
          open={mobileNavOpen}
          onOpenChange={setMobileNavOpen}
          menuTree={menuTree}
          onNavigate={handleNavigate}
        />
      )}

      <SidebarInset>
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4">
          <div className="flex items-center gap-2">
            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            ) : (
              <SidebarTrigger />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-medium">{displayName ?? user?.sub ?? '—'}</span>
                <Badge variant="secondary">{formatRoleLabel(user?.role)}</Badge>
                {!showBranchSwitcher && (
                  <Badge variant="outline">{branchDisplayLabel}</Badge>
                )}
              </div>
              {showBranchSwitcher && (
                <div className="mt-1 flex items-center justify-end gap-2">
                  <span className="text-xs text-muted-foreground">Branch</span>
                  <Select
                    value={activeBranchId ?? undefined}
                    onValueChange={(branchId) => {
                      if (branchId) void handleBranchSwitch(branchId);
                    }}
                    disabled={branchSelectLoading}
                  >
                    <SelectTrigger className="h-7 w-auto max-w-[220px] border-0 shadow-none" aria-label="Select active branch">
                      <SelectValue placeholder="Select branch">{activeBranchSelectLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem
                          key={branch.branch_id}
                          value={branch.branch_id}
                          disabled={branch.active === false}
                        >
                          {formatBranchOptionLabel(branch)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {viewingOtherBranch && homeBranchId ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-1 text-xs"
                      onClick={() => void handleBranchSwitch(homeBranchId)}
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {currentTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="rounded-full"
                    aria-label={`Account menu for ${displayName ?? user?.sub ?? 'current user'}`}
                  >
                    <UserAvatar
                      firstname={headerProfile?.firstname}
                      lastname={headerProfile?.lastname}
                      displayName={displayName}
                      username={headerProfile?.username}
                    />
                  </button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="size-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                >
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 bg-muted/30 p-4 md:p-6">
          {menuError ? (
            <Alert variant="destructive">
              <AlertTitle>System warning</AlertTitle>
              <AlertDescription>
                Some menu items are temporarily unavailable. Please try refreshing the page or logging in again.
              </AlertDescription>
            </Alert>
          ) : null}

          <Outlet key={user?.branch_id ?? 'guest'} />
        </main>
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
