import { useShallow } from "zustand/react/shallow";

import { BranchSwitcher } from "@/components/layout/BranchSwitcher";
import { NavMain } from "@/components/layout/NavMain";
import { NavUser } from "@/components/layout/NavUser";
import type { MenuItemType } from "@/components/layout/types";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
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
  branchSelectLoading: boolean;
  viewingOtherBranch: boolean;
  homeBranchId: string | undefined;
  onBranchSwitch: (branchId: string) => void;
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
  branchSelectLoading,
  viewingOtherBranch,
  homeBranchId,
  onBranchSwitch,
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
        <BranchSwitcher
          showBranchSwitcher={showBranchSwitcher}
          branchDisplayLabel={branchDisplayLabel}
          activeBranchId={activeBranchId}
          activeBranchSelectLabel={activeBranchSelectLabel}
          branches={branches}
          branchSelectLoading={branchSelectLoading}
          viewingOtherBranch={viewingOtherBranch}
          homeBranchId={homeBranchId}
          onBranchSwitch={onBranchSwitch}
          roleLabel={roleLabel}
        />
      </SidebarHeader>
      <SidebarContent>
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
