import { useShallow } from "zustand/react/shallow";

import { AppBrand } from "@/components/layout/AppBrand";
import { BranchSwitcher } from "@/components/layout/BranchSwitcher";
import { NavMain } from "@/components/layout/NavMain";
import { NavUser } from "@/components/layout/NavUser";
import type { MenuItemType } from "@/components/layout/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { SidebarCollapsible, SidebarVariant } from "@/lib/preferences/layout";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import type { DecodedUser } from "@/types/auth";
import type { InvoiceAgentBranch } from "@/types/invoice";

export interface AppSidebarProps {
  menuTree: MenuItemType[];
  selectedPath: string;
  onNavigate: (route: string) => void;
  showBranchSwitcher: boolean;
  branchDisplayLabel: string;
  activeBranchId: string | undefined;
  activeBranchSelectLabel: string;
  branches: InvoiceAgentBranch[];
  branchCatalogHasMultiple?: boolean;
  branchSelectLoading: boolean;
  branchSearchQuery?: string;
  branchSearchLoading?: boolean;
  viewingOtherBranch: boolean;
  homeBranchId: string | undefined;
  onBranchSwitch: (branchId: string) => void;
  onBranchSearchQueryChange?: (query: string) => void;
  onDropdownOpenChange?: (open: boolean) => void;
  roleLabel: string;
  displayName: string | null;
  headerProfile: { firstname: string; lastname: string; username: string } | null;
  user: DecodedUser | null;
  onProfile: () => void;
  onLogout: () => void;
  sidebarVariant?: SidebarVariant;
  sidebarCollapsible?: SidebarCollapsible;
}

export function AppSidebar({
  menuTree,
  selectedPath,
  onNavigate,
  showBranchSwitcher,
  branchDisplayLabel,
  activeBranchId,
  activeBranchSelectLabel,
  branches,
  branchCatalogHasMultiple,
  branchSelectLoading,
  branchSearchQuery,
  branchSearchLoading,
  viewingOtherBranch,
  homeBranchId,
  onBranchSwitch,
  onBranchSearchQueryChange,
  onDropdownOpenChange,
  roleLabel,
  displayName,
  headerProfile,
  user,
  onProfile,
  onLogout,
  sidebarVariant: sidebarVariantProp,
  sidebarCollapsible: sidebarCollapsibleProp,
}: AppSidebarProps) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((state) => ({
      sidebarVariant: state.values.sidebar_variant,
      sidebarCollapsible: state.values.sidebar_collapsible,
      isSynced: state.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : (sidebarVariantProp ?? sidebarVariant);
  const collapsible = isSynced ? sidebarCollapsible : (sidebarCollapsibleProp ?? sidebarCollapsible);

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppBrand />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <BranchSwitcher
              showBranchSwitcher={showBranchSwitcher}
              branchDisplayLabel={branchDisplayLabel}
              activeBranchId={activeBranchId}
              activeBranchSelectLabel={activeBranchSelectLabel}
              branches={branches}
              branchCatalogHasMultiple={branchCatalogHasMultiple}
              branchSelectLoading={branchSelectLoading}
              branchSearchQuery={branchSearchQuery}
              branchSearchLoading={branchSearchLoading}
              viewingOtherBranch={viewingOtherBranch}
              homeBranchId={homeBranchId}
              onBranchSwitch={onBranchSwitch}
              onBranchSearchQueryChange={onBranchSearchQueryChange}
              onDropdownOpenChange={onDropdownOpenChange}
              roleLabel={roleLabel}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <NavMain items={menuTree} selectedPath={selectedPath} onNavigate={onNavigate} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          displayName={displayName}
          headerProfile={headerProfile}
          user={user}
          roleLabel={roleLabel}
          onProfile={onProfile}
          onLogout={onLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
