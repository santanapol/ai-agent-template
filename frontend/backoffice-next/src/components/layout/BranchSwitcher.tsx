import { ChevronsUpDown, Store } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { formatBranchOptionLabel } from "@/lib/branchOptions";
import type { InvoiceAgentBranch } from "@/types/invoice";

export function BranchSwitcher({
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
}: {
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
}) {
  const { isMobile } = useSidebar();
  const hasMultipleBranches = branches.length > 1;
  const showDropdown = showBranchSwitcher && (hasMultipleBranches || viewingOtherBranch);
  const subtitle = showBranchSwitcher ? (viewingOtherBranch ? "Viewing other branch" : "Branch") : roleLabel;

  if (!showDropdown) {
    const title = showBranchSwitcher ? activeBranchSelectLabel : branchDisplayLabel;
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent active:bg-transparent">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Store aria-hidden="true" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{title}</span>
              <span className="truncate text-muted-foreground text-xs">{subtitle}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                aria-label="Select active branch"
                disabled={branchSelectLoading}
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Store aria-hidden="true" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeBranchSelectLabel}</span>
              <span className="truncate text-muted-foreground text-xs">{subtitle}</span>
            </div>
            <ChevronsUpDown className="ml-auto" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">Branches</DropdownMenuLabel>
              {branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.branch_id}
                  disabled={branch.active === false}
                  className="gap-2 p-2"
                  onClick={() => {
                    if (branch.branch_id !== activeBranchId) {
                      onBranchSwitch(branch.branch_id);
                    }
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Store aria-hidden="true" />
                  </div>
                  <span className="truncate">{formatBranchOptionLabel(branch)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {viewingOtherBranch && homeBranchId ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-2 p-2" onClick={() => onBranchSwitch(homeBranchId)}>
                    Reset to home branch
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
