import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import axios from "axios";
import { Plus } from "lucide-react";

import { ListPageCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import * as authApi from "@/lib/authApiClient";
import type { AdminMenuNode } from "@/types/permissionAdmin";

import MenuCatalogTab from "./MenuCatalogTab";
import RolePermissionsTab from "./RolePermissionsTab";
import AdminApiForbidden from "./AdminApiForbidden";

const PermissionAdmin: React.FC = () => {
  const { message } = useAppFeedback();
  const messageRef = useRef(message);
  messageRef.current = message;

  const [activeTab, setActiveTab] = useState("menus");
  const openMenuCreateRef = useRef<(() => void) | null>(null);
  const [menus, setMenus] = useState<AdminMenuNode[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);
  const [menusForbidden, setMenusForbidden] = useState(false);

  const reloadMenus = useCallback(async () => {
    setMenusLoading(true);
    setMenusForbidden(false);
    try {
      const data = await authApi.listAdminMenus();
      setMenus(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setMenusForbidden(true);
        return;
      }
      messageRef.current.error(apiErrorMessage(err, "Failed to load menu catalog"));
    } finally {
      setMenusLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadMenus();
  }, [reloadMenus]);

  const handleMenuCreateReady = useCallback((openCreate: () => void) => {
    openMenuCreateRef.current = openCreate;
  }, []);

  if (menusForbidden) {
    return (
      <ListPageCard
        title="Permissions"
        description="Manage system menu catalog and role permissions mapping."
      >
        <div className="px-4">
          <AdminApiForbidden />
        </div>
      </ListPageCard>
    );
  }

  return (
    <ListPageCard
      title="Permissions"
      description="Manage system menu catalog and role permissions mapping."
      toolbar={
        activeTab === "menus" ? (
          <Button onClick={() => openMenuCreateRef.current?.()}>
            <Plus data-icon="inline-start" />
            Create menu node
          </Button>
        ) : undefined
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList>
          <TabsTrigger value="menus">Menu catalog</TabsTrigger>
          <TabsTrigger value="roles">Role permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="menus" keepMounted className="mt-4">
          <MenuCatalogTab
            menus={menus}
            menusLoading={menusLoading}
            menusForbidden={menusForbidden}
            reloadMenus={reloadMenus}
            onCreateActionReady={handleMenuCreateReady}
          />
        </TabsContent>
        <TabsContent value="roles" keepMounted className="mt-4">
          <RolePermissionsTab menus={menus} menusLoading={menusLoading} menusForbidden={menusForbidden} />
        </TabsContent>
      </Tabs>
    </ListPageCard>
  );
};

export default PermissionAdmin;
