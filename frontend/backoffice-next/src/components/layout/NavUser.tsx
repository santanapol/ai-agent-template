import { EllipsisVertical, LogOut, User } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
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
import type { DecodedUser } from "@/types/auth";

export function NavUser({
  displayName,
  headerProfile,
  user,
  roleLabel,
  onProfile,
  onLogout,
}: {
  displayName: string | null;
  headerProfile: { firstname: string; lastname: string; username: string } | null;
  user: DecodedUser | null;
  roleLabel: string;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const { isMobile } = useSidebar();
  const accountName = displayName ?? headerProfile?.username ?? user?.username ?? user?.sub ?? "—";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                aria-label={`Account menu for ${accountName}`}
              />
            }
          >
            <UserAvatar
              firstname={headerProfile?.firstname}
              lastname={headerProfile?.lastname}
              displayName={displayName}
              username={headerProfile?.username}
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{accountName}</span>
              <span className="truncate text-muted-foreground text-xs">{roleLabel}</span>
            </div>
            <EllipsisVertical className="ml-auto size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserAvatar
                    firstname={headerProfile?.firstname}
                    lastname={headerProfile?.lastname}
                    displayName={displayName}
                    username={headerProfile?.username}
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{accountName}</span>
                    <span className="truncate text-muted-foreground text-xs">{roleLabel}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onProfile}>
                <User />
                My Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
