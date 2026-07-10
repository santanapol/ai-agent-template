import { useEffect, useId, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
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
  branchSearchQuery = "",
  branchSearchLoading = false,
  viewingOtherBranch,
  homeBranchId,
  onBranchSwitch,
  onBranchSearchQueryChange,
  onDropdownOpenChange,
  roleLabel,
}: {
  showBranchSwitcher: boolean;
  branchDisplayLabel: string;
  activeBranchId: string | undefined;
  activeBranchSelectLabel: string;
  branches: InvoiceAgentBranch[];
  branchSelectLoading: boolean;
  branchSearchQuery?: string;
  branchSearchLoading?: boolean;
  viewingOtherBranch: boolean;
  homeBranchId: string | undefined;
  onBranchSwitch: (branchId: string) => void;
  onBranchSearchQueryChange?: (query: string) => void;
  onDropdownOpenChange?: (open: boolean) => void;
  roleLabel: string;
}) {
  const { isMobile } = useSidebar();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMultipleBranches = branches.length > 1;
  const showDropdown = showBranchSwitcher && (hasMultipleBranches || viewingOtherBranch);
  let subtitle = roleLabel;
  if (showBranchSwitcher) {
    subtitle = viewingOtherBranch ? "Viewing other branch" : "Branch";
  }

  useEffect(() => {
    if (!menuOpen || !onBranchSearchQueryChange) return;
    // Focus search when the menu opens so keyboard users can type immediately (FE-REV-009).
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [menuOpen, onBranchSearchQueryChange]);

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
        <DropdownMenu
          onOpenChange={(open) => {
            setMenuOpen(open);
            onDropdownOpenChange?.(open);
          }}
        >
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
            {onBranchSearchQueryChange ? (
              <search className="p-2">
                <label htmlFor={searchInputId} className="sr-only">
                  Search branches
                </label>
                <Input
                  ref={searchInputRef}
                  id={searchInputId}
                  type="search"
                  value={branchSearchQuery}
                  onChange={(e) => onBranchSearchQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    // Keep typing in the search field; do not let menu typeahead steal keys.
                    e.stopPropagation();
                  }}
                  placeholder="Search branches…"
                  aria-label="Search branches"
                  aria-controls="branch-switcher-options"
                  autoComplete="off"
                  className="h-8"
                  disabled={branchSearchLoading}
                />
              </search>
            ) : null}
            <DropdownMenuGroup id="branch-switcher-options">
              <DropdownMenuLabel className="text-muted-foreground text-xs">Branches</DropdownMenuLabel>
              {branches.length === 0 ? (
                <div className="px-2 py-1.5 text-muted-foreground text-sm" role="status">
                  {branchSearchLoading ? "Searching…" : "No branches found"}
                </div>
              ) : (
                branches.map((branch) => (
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
                ))
              )}
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
