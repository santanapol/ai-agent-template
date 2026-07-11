import { type Dispatch, type SetStateAction, useState } from "react";

import { ChevronRight } from "lucide-react";

import { isDashboardMenuItem, type MenuItemType } from "@/components/layout/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "@/navigation/compat";

function isRouteActive(menuRoute: string, selectedPath: string): boolean {
  if (menuRoute === selectedPath) return true;
  if (menuRoute !== "/" && selectedPath.startsWith(`${menuRoute}/`)) return true;
  return false;
}

function isPathInSubtree(item: MenuItemType, path: string): boolean {
  if (item.route && isRouteActive(item.route, path)) return true;
  return item.children?.some((child) => isPathInSubtree(child, path)) ?? false;
}

function NavDropdownItem({
  item,
  selectedPath,
  onNavigate,
}: {
  item: MenuItemType;
  selectedPath: string;
  onNavigate: (route: string) => void;
}) {
  const isActive = isPathInSubtree(item, selectedPath);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton tooltip={item.label} isActive={isActive} />}>
          {item.icon}
          <span>{item.label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-48">
          <DropdownMenuGroup>
            {item.children?.map((child) =>
              child.route ? (
                <DropdownMenuItem key={child.key} className="p-0">
                  <Link
                    to={child.route}
                    onClick={() => onNavigate(child.route!)}
                    className="flex w-full items-center px-2 py-1.5"
                  >
                    <span>{child.label}</span>
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={child.key}>
                  <span>{child.label}</span>
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function NavMenuItems({
  items,
  selectedPath,
  onNavigate,
  isCollapsedDesktop,
  openGroups,
  setOpenGroups,
}: {
  items: MenuItemType[];
  selectedPath: string;
  onNavigate: (route: string) => void;
  isCollapsedDesktop: boolean;
  openGroups: Record<string, boolean>;
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <>
      {items.map((item) => {
        if (item.children?.length) {
          if (isCollapsedDesktop) {
            return <NavDropdownItem key={item.key} item={item} selectedPath={selectedPath} onNavigate={onNavigate} />;
          }

          const isOpen = openGroups[item.key] ?? isPathInSubtree(item, selectedPath);

          return (
            <Collapsible
              key={item.key}
              open={isOpen}
              onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [item.key]: open }))}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.label} />}>
                {item.icon}
                <span>{item.label}</span>
                <ChevronRight
                  className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={child.key}>
                      {child.route ? (
                        <SidebarMenuSubButton
                          isActive={child.route ? isRouteActive(child.route, selectedPath) : false}
                          render={<Link to={child.route} onClick={() => onNavigate(child.route!)} />}
                        >
                          <span>{child.label}</span>
                        </SidebarMenuSubButton>
                      ) : (
                        <SidebarMenuSubButton isActive={false}>
                          <span>{child.label}</span>
                        </SidebarMenuSubButton>
                      )}
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          );
        }

        return (
          <SidebarMenuItem key={item.key}>
            {item.route ? (
              <SidebarMenuButton
                isActive={item.route ? isRouteActive(item.route, selectedPath) : false}
                tooltip={item.label}
                render={<Link to={item.route} onClick={() => onNavigate(item.route!)} />}
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton isActive={false} tooltip={item.label}>
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

export function NavMain({
  items,
  selectedPath,
  onNavigate,
}: {
  items: MenuItemType[];
  selectedPath: string;
  onNavigate: (route: string) => void;
}) {
  const { state, isMobile } = useSidebar();
  const isCollapsedDesktop = state === "collapsed" && !isMobile;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const dashboardItems = items.filter(isDashboardMenuItem);
  const menuItems = items.filter((item) => !isDashboardMenuItem(item));

  const sharedItemProps = {
    selectedPath,
    onNavigate,
    isCollapsedDesktop,
    openGroups,
    setOpenGroups,
  };

  return (
    <>
      {dashboardItems.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <NavMenuItems items={dashboardItems} {...sharedItemProps} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}

      {menuItems.length > 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavMenuItems items={menuItems} {...sharedItemProps} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
    </>
  );
}
