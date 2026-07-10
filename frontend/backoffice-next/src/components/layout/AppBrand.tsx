import { Command } from "lucide-react";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { Link } from "@/navigation/compat";

export function AppBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link to="/" />} tooltip={APP_CONFIG.name}>
          <Command aria-hidden="true" />
          <span className="font-semibold text-base">{APP_CONFIG.name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
