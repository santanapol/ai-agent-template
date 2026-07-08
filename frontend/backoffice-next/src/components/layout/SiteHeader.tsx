import { Menu } from "lucide-react";

import { LayoutControls } from "@/components/layout/LayoutControls";
import { SearchDialog } from "@/components/layout/SearchDialog";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import type { MenuItemType } from "@/components/layout/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SiteHeader({
  isMobile,
  onOpenMobileNav,
  mobileBranchLabel,
  menuTree,
  onNavigate,
}: {
  isMobile: boolean;
  onOpenMobileNav: () => void;
  mobileBranchLabel?: string | null;
  menuTree?: MenuItemType[];
  onNavigate?: (route: string) => void;
}) {
  const showSearch = Boolean(menuTree && onNavigate);

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
      )}
    >
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-1 lg:gap-2">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-1"
              onClick={onOpenMobileNav}
              aria-label="Open navigation menu"
            >
              <Menu aria-hidden="true" />
            </Button>
          ) : (
            <>
              <SidebarTrigger className="-ml-1" />
              {menuTree && onNavigate ? (
                <>
                  <Separator
                    orientation="vertical"
                    className="mx-2 h-4 self-center data-vertical:h-4 data-vertical:self-center"
                  />
                  <SearchDialog menuTree={menuTree} onNavigate={onNavigate} />
                </>
              ) : null}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMobile && mobileBranchLabel ? (
            <p className="max-w-[45%] truncate text-muted-foreground text-sm" title={mobileBranchLabel}>
              {mobileBranchLabel}
            </p>
          ) : null}
          {isMobile && showSearch && menuTree && onNavigate ? (
            <SearchDialog menuTree={menuTree} onNavigate={onNavigate} mobile />
          ) : null}
          <LayoutControls />
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
