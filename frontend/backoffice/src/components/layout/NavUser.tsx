import { ChevronsUpDown, LogOut, Moon, Sun, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { UserAvatar } from '@/components/UserAvatar';
import type { DecodedUser } from '@/types/auth';

export function NavUser({
  displayName,
  headerProfile,
  user,
  roleLabel,
  currentTheme,
  onToggleTheme,
  onProfile,
  onLogout,
}: {
  displayName: string | null;
  headerProfile: { firstname: string; lastname: string; username: string } | null;
  user: DecodedUser | null;
  roleLabel: string;
  currentTheme: string;
  onToggleTheme: () => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const { isMobile } = useSidebar();
  const accountName =
    displayName ?? headerProfile?.username ?? user?.username ?? user?.sub ?? '—';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted"
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
              <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
            </div>
            <ChevronsUpDown className="ml-auto" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side={isMobile ? 'bottom' : 'right'}
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
                    <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onToggleTheme}>
                {currentTheme === 'dark' ? <Sun /> : <Moon />}
                {currentTheme === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
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
