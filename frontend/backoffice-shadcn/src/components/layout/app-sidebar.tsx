import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import type { MenuItemType } from '@/components/layout/types';
import type { InvoiceAgentBranch } from '@/types/invoice';
import type { DecodedUser } from '@/types/auth';

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
  currentTheme: string;
  onToggleTheme: () => void;
  onProfile: () => void;
  onLogout: () => void;
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
  currentTheme,
  onToggleTheme,
  onProfile,
  onLogout,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
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
          currentTheme={currentTheme}
          onToggleTheme={onToggleTheme}
          onProfile={onProfile}
          onLogout={onLogout}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
