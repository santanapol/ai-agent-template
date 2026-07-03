import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import type { MenuItemType } from '@/components/layout/types';

function isPathInSubtree(item: MenuItemType, path: string): boolean {
  if (item.route === path) return true;
  return item.children?.some((child) => isPathInSubtree(child, path)) ?? false;
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          if (item.children?.length) {
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
                        <SidebarMenuSubButton
                          isActive={child.route === selectedPath}
                          onClick={() => child.route && onNavigate(child.route)}
                        >
                          <span>{child.label}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                isActive={item.route === selectedPath}
                tooltip={item.label}
                onClick={() => item.route && onNavigate(item.route)}
              >
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
