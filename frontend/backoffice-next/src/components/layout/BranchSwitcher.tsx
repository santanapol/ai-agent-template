import { useEffect, useId, useMemo, useRef, useState } from "react";

import { ChevronsUpDown, Home, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { formatBranchOptionLabel, isZeroHqBranchId, ZERO_HQ_BRANCH_ID } from "@/lib/branchOptions";
import { cn } from "@/lib/utils";
import type { InvoiceAgentBranch } from "@/types/invoice";

const branchTriggerClassName = cn(
  "min-w-8 flex-1 bg-primary text-primary-foreground duration-200 ease-linear",
  "hover:bg-primary/90 hover:text-primary-foreground",
  "active:bg-primary/90 active:text-primary-foreground",
  "data-open:bg-primary/90 data-open:text-primary-foreground",
  "data-open:hover:bg-primary/90 data-open:hover:text-primary-foreground",
);

const branchTriggerInactiveClassName = cn(
  "min-w-8 flex-1 bg-muted text-muted-foreground duration-200 ease-linear",
  "hover:bg-muted/80 hover:text-muted-foreground",
  "active:bg-muted/80 active:text-muted-foreground",
  "data-open:bg-muted/80 data-open:text-muted-foreground",
  "data-open:hover:bg-muted/80 data-open:hover:text-muted-foreground",
);

function BranchMenuRow({
  branch,
  activeBranchId,
  onBranchSwitch,
}: {
  branch: InvoiceAgentBranch;
  activeBranchId: string | undefined;
  onBranchSwitch: (branchId: string) => void;
}) {
  const label = formatBranchOptionLabel(branch);
  const inactive = branch.active === false;
  return (
    <DropdownMenuItem
      className={cn("gap-2 p-2", inactive && "text-muted-foreground")}
      aria-label={inactive ? `${label} (inactive)` : label}
      onClick={() => {
        if (branch.branch_id !== activeBranchId) {
          onBranchSwitch(branch.branch_id);
        }
      }}
    >
      <div className="flex size-6 items-center justify-center rounded-md border">
        <Store aria-hidden="true" />
      </div>
      <span className="truncate">{label}</span>
    </DropdownMenuItem>
  );
}

function HomeBranchButton({
  activeBranchId,
  disabled,
  onBranchSwitch,
}: {
  activeBranchId: string | undefined;
  disabled?: boolean;
  onBranchSwitch: (branchId: string) => void;
}) {
  const atHq = isZeroHqBranchId(activeBranchId);
  return (
    <Button
      size="icon"
      variant="outline"
      className="size-8 h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
      aria-label="Reset to Zero HQ"
      // biome-ignore lint/nursery/useNullishCoalescing: boolean OR — disabled when either flag is true
      disabled={disabled || atHq}
      onClick={() => {
        if (!atHq) onBranchSwitch(ZERO_HQ_BRANCH_ID);
      }}
    >
      <Home aria-hidden="true" />
      <span className="sr-only">Home</span>
    </Button>
  );
}

export function BranchSwitcher({
  showBranchSwitcher,
  branchDisplayLabel,
  activeBranchId,
  activeBranchSelectLabel,
  branches,
  branchCatalogHasMultiple = false,
  branchSelectLoading,
  branchSearchQuery = "",
  branchSearchLoading = false,
  viewingOtherBranch,
  homeBranchId: _homeBranchId,
  onBranchSwitch,
  onBranchSearchQueryChange,
  onDropdownOpenChange,
  roleLabel: _roleLabel,
}: {
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
}) {
  const { isMobile } = useSidebar();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();
  const showInactiveId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  // biome-ignore lint/nursery/useNullishCoalescing: both are real booleans (not nullable) - false must fall through to the next check, which ?? would not do.
  const showDropdown = showBranchSwitcher && (branchCatalogHasMultiple || viewingOtherBranch);

  const activeBranchInactive = useMemo(() => {
    const active = branches.find((branch) => branch.branch_id === activeBranchId);
    return active?.active === false;
  }, [branches, activeBranchId]);

  const triggerClassName = activeBranchInactive ? branchTriggerInactiveClassName : branchTriggerClassName;

  const visibleBranches = useMemo(() => {
    const withoutHq = branches.filter((branch) => !isZeroHqBranchId(branch.branch_id));
    if (showInactive) return withoutHq;
    return withoutHq.filter((branch) => branch.active !== false || branch.branch_id === activeBranchId);
  }, [branches, showInactive, activeBranchId]);

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
        <SidebarMenuItem className="flex items-center gap-2">
          <SidebarMenuButton
            size="default"
            className={cn(
              triggerClassName,
              "cursor-default",
              activeBranchInactive ? "hover:bg-muted active:bg-muted" : "hover:bg-primary active:bg-primary",
            )}
            tooltip={title}
          >
            <Store aria-hidden="true" />
            <span className="truncate">{title}</span>
          </SidebarMenuButton>
          {showBranchSwitcher ? (
            <HomeBranchButton
              activeBranchId={activeBranchId}
              disabled={branchSelectLoading}
              onBranchSwitch={onBranchSwitch}
            />
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-2">
        <DropdownMenu
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (!open) setShowInactive(false);
            onDropdownOpenChange?.(open);
          }}
        >
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="default"
                className={triggerClassName}
                aria-label="Select active branch"
                disabled={branchSelectLoading}
                tooltip={activeBranchSelectLabel}
              />
            }
          >
            <Store aria-hidden="true" />
            <span className="truncate">{activeBranchSelectLabel}</span>
            <ChevronsUpDown className="ml-auto opacity-50" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {onBranchSearchQueryChange ? (
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-popover p-2">
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
                  placeholder="Search…"
                  aria-label="Search branches"
                  aria-controls="branch-switcher-options"
                  autoComplete="off"
                  className="h-8 min-w-0 flex-1"
                  disabled={branchSearchLoading}
                />
                <label
                  htmlFor={showInactiveId}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 text-muted-foreground text-xs"
                  onPointerDown={(e) => {
                    // Keep the menu open while toggling the filter.
                    e.preventDefault();
                  }}
                >
                  <Checkbox
                    id={showInactiveId}
                    checked={showInactive}
                    onCheckedChange={(value) => setShowInactive(value === true)}
                    aria-label="Show all branches"
                    className="size-3.5"
                  />
                  All
                </label>
              </div>
            ) : null}
            <DropdownMenuGroup id="branch-switcher-options">
              <DropdownMenuLabel className="text-muted-foreground text-xs">Branches</DropdownMenuLabel>
              {visibleBranches.length === 0 ? (
                <div className="px-2 py-1.5 text-muted-foreground text-sm" role="status">
                  {branchSearchLoading ? "Searching…" : "No branches found"}
                </div>
              ) : (
                visibleBranches.map((branch) => (
                  <BranchMenuRow
                    key={branch.branch_id}
                    branch={branch}
                    activeBranchId={activeBranchId}
                    onBranchSwitch={onBranchSwitch}
                  />
                ))
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <HomeBranchButton
          activeBranchId={activeBranchId}
          disabled={branchSelectLoading}
          onBranchSwitch={onBranchSwitch}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
