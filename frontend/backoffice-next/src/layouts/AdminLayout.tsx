import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
} from "lucide-react";

import { AppBrand } from "@/components/layout/AppBrand";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BranchSwitcher } from "@/components/layout/BranchSwitcher";
import { NavMain } from "@/components/layout/NavMain";
import { NavUser } from "@/components/layout/NavUser";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { flattenMenuToTwoLevels, type MenuItemType } from "@/components/layout/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useIsMobile } from "@/hooks/useMobile";
import { apiErrorMessage } from "@/lib/apiError";
import * as authApi from "@/lib/authApiClient";
import { branchCatalogCacheKey, getBranchCatalog, peekBranchCatalog } from "@/lib/branchCatalogCache";
import {
  canSwitchActiveBranch,
  findInvoiceAgentBranch,
  formatActiveBranchLabel,
  formatBranchOptionLabel,
  getCachedMyBranch,
  mergePlatformBranches,
  setCachedMyBranch,
  upsertBranchInList,
} from "@/lib/branchOptions";
import { subscribeProfileRefresh } from "@/lib/profileRefresh";
import * as staffApi from "@/lib/staffApiClient";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "@/navigation/compat";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import type { InvoiceAgentBranch } from "@/types/invoice";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  branch_admin: "Branch Admin",
  support_admin: "Support Admin",
  support: "Support",
  staff: "Staff",
};

function formatRoleLabel(role: string | undefined): string {
  if (!role) return "—";
  return (
    ROLE_LABELS[role] ??
    role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

const SIDEBAR_EXCLUDED_MENU_KEYS = new Set(["my_profile"]);

const MENU_ENTRIES: Record<string, { icon: React.ReactNode; route?: string }> = {
  dashboard: { icon: <LayoutDashboard />, route: "/" },
  "dashboard:view": { icon: <LayoutDashboard />, route: "/" },
  staff: { icon: <Users /> },
  "profiles:list": { icon: <Users />, route: "/staff" },
  billing: { icon: <WalletCards /> },
  "agents:list": { icon: <Store />, route: "/agents" },
  "invoices:list": { icon: <DollarSign />, route: "/invoices" },
  reports: { icon: <Code2 /> },
  "reports:smart": { icon: <BarChart3 />, route: "/smart-reports" },
  "branch-report": { icon: <LineChart /> },
  "branch-report:marketing:channel-performance:read": {
    icon: <LineChart />,
    route: "/branch-report/channel-performance",
  },
  my_profile: { icon: <User />, route: "/profile" },
  settings: { icon: <Settings /> },
  "permissions:manage": { icon: <ShieldCheck />, route: "/permissions" },
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
        <SheetTitle className="sr-only">Main navigation</SheetTitle>
        <SheetDescription className="sr-only">
          {APP_CONFIG.name} menu, branch context, and account actions.
        </SheetDescription>
        <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
          <div className="flex flex-col gap-2 p-2">
            <AppBrand />
            <BranchSwitcher {...branchSwitcherProps} />
          </div>
          <div className="flex-1 overflow-auto p-2">
            <NavMain items={menuTree} selectedPath={selectedPath} onNavigate={handleNavigate} />
          </div>
          <div className="border-sidebar-border border-t p-2">
            <NavUser {...navUserProps} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const sidebarVariant = usePreferencesStore((state) => state.values.sidebar_variant);
  const sidebarCollapsible = usePreferencesStore((state) => state.values.sidebar_collapsible);
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
  const [branchSearchQuery, setBranchSearchQuery] = useState("");
  const [debouncedBranchSearch, setDebouncedBranchSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState<InvoiceAgentBranch | null>(() => getCachedMyBranch(user?.branch_id));
  const [activeBranchLoading, setActiveBranchLoading] = useState(false);
  const [optimisticBranchId, setOptimisticBranchId] = useState<string | null>(null);
  const [branchCatalogHasMultiple, setBranchCatalogHasMultiple] = useState(false);
  const [_profileRefreshKey, setProfileRefreshKey] = useState(0);

  const showBranchSwitcher = canSwitchActiveBranch(user?.role);
  const homeBranchId = user?.home_branch_id ?? user?.branch_id;
  const activeBranchId = optimisticBranchId ?? user?.branch_id;
  const viewingOtherBranch = Boolean(user?.home_branch_id) && activeBranchId !== user?.home_branch_id;
  const roleLabel = formatRoleLabel(user?.role);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBranchSearch(branchSearchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [branchSearchQuery]);

  const handleBranchDropdownOpenChange = useCallback((open: boolean) => {
    if (!open) setBranchSearchQuery("");
  }, []);

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
        message.error(apiErrorMessage(err, "Could not switch branch"));
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
  }, [user?.sub]);

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
      setBranchCatalogHasMultiple(false);
      return;
    }

    let cancelled = false;
    const searchParams = debouncedBranchSearch ? { q: debouncedBranchSearch } : undefined;
    const cacheKey = user.ou_id ? `${branchCatalogCacheKey(user.ou_id, "auth")}:${debouncedBranchSearch}` : null;

    // FE-REV-008: paint cached switcher results immediately to avoid empty flicker.
    if (cacheKey) {
      const cached = peekBranchCatalog(cacheKey);
      if (cached) {
        let list = cached;
        if (activeBranch) list = upsertBranchInList(list, activeBranch);
        setBranches(mergePlatformBranches(list));
        setBranchesLoading(false);
      } else {
        setBranchesLoading(true);
      }
    } else {
      setBranchesLoading(true);
    }

    const loadSwitcherBranches = async () => {
      let list: InvoiceAgentBranch[] = [];
      try {
        if (cacheKey) {
          list = await getBranchCatalog(cacheKey, () => authApi.listMyBranches(searchParams));
        } else {
          list = await authApi.listMyBranches(searchParams);
        }
      } catch {
        // Switcher still works with active branch only when branch list is unavailable.
      }
      if (activeBranch) list = upsertBranchInList(list, activeBranch);
      if (cancelled) return;
      const sorted = mergePlatformBranches(list);
      if (!debouncedBranchSearch && sorted.length > 1) {
        setBranchCatalogHasMultiple(true);
      }
      // Keep switcher results in the auth catalog cache only — not the invoice shared cache (FE-REV-001).
      setBranches(sorted);
      setBranchesLoading(false);
    };
    void loadSwitcherBranches();
    return () => {
      cancelled = true;
    };
  }, [user?.sub, user?.ou_id, showBranchSwitcher, activeBranch, debouncedBranchSearch]);

  const branchDisplayLabel = formatActiveBranchLabel(activeBranch, user?.branch_id, activeBranchLoading);

  const { sidebarMenuTree, breadcrumbMenuTree } = useMemo(() => {
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
        const parentVal = itemMap.get(parentKey);
        if (parentVal) {
          if (!parentVal.item.children) parentVal.item.children = [];
          parentVal.item.children.push(item);
        }
      } else {
        rootItems.push(item);
      }
    });
    const sortItems = (items: MenuItemType[], depth = 0) => {
      if (depth > 5) {
        console.warn("Menu structure exceeded maximum depth or contains a cycle");
        return;
      }
      items.sort((a, b) => a.sort_order - b.sort_order);
      items.forEach((i) => {
        if (i.children) sortItems(i.children, depth + 1);
      });
    };
    sortItems(rootItems);
    return {
      breadcrumbMenuTree: rootItems,
      sidebarMenuTree: flattenMenuToTwoLevels(rootItems),
    };
  }, [menus]);

  const branchSelectLoading = branchSwitching || (showBranchSwitcher && branchesLoading && branches.length === 0);

  const activeBranchSelectLabel = useMemo(() => {
    const match = branches.find((b) => b.branch_id === activeBranchId);
    if (match) return formatBranchOptionLabel(match);
    if (activeBranch && activeBranch.branch_id === activeBranchId) {
      return formatBranchOptionLabel(activeBranch);
    }
    return branchDisplayLabel;
  }, [branches, activeBranchId, activeBranch, branchDisplayLabel]);

  const handleNavigate = (route: string) => navigate(route);

  const branchSwitcherProps = {
    showBranchSwitcher,
    branchDisplayLabel,
    activeBranchId,
    activeBranchSelectLabel,
    branches,
    branchCatalogHasMultiple,
    branchSelectLoading,
    branchSearchQuery,
    branchSearchLoading: branchesLoading,
    viewingOtherBranch,
    homeBranchId,
    onBranchSwitch: (branchId: string) => void handleBranchSwitch(branchId),
    onBranchSearchQueryChange: setBranchSearchQuery,
    onDropdownOpenChange: handleBranchDropdownOpenChange,
    roleLabel,
  };

  const navUserProps = {
    displayName,
    headerProfile,
    user,
    roleLabel,
    onProfile: () => navigate("/profile"),
    onLogout: () => {
      void logout().then(() => navigate("/login"));
    },
  };

  const sidebarProps = {
    menuTree: sidebarMenuTree,
    selectedPath: location.pathname,
    onNavigate: handleNavigate,
    ...branchSwitcherProps,
    ...navUserProps,
    sidebarVariant,
    sidebarCollapsible,
  };

  return (
    <>
      {!isMobile ? <AppSidebar {...sidebarProps} /> : null}

      <MobileNavSheet
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        menuTree={sidebarMenuTree}
        selectedPath={location.pathname}
        onNavigate={handleNavigate}
        branchSwitcherProps={branchSwitcherProps}
        navUserProps={navUserProps}
      />

      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        <SiteHeader
          isMobile={isMobile}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          menuTree={breadcrumbMenuTree}
          onNavigate={handleNavigate}
          mobileBranchLabel={isMobile ? (showBranchSwitcher ? activeBranchSelectLabel : branchDisplayLabel) : null}
        />

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          {menuError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>System warning</AlertTitle>
              <AlertDescription>
                Some menu items are temporarily unavailable. Please try refreshing the page or logging in again.
              </AlertDescription>
            </Alert>
          ) : null}

          <div key={user?.branch_id ?? "guest"}>{children}</div>
        </div>
      </SidebarInset>
    </>
  );
};

function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <AdminLayout>{children}</AdminLayout>
    </SidebarProvider>
  );
}

export default AdminLayoutShell;
