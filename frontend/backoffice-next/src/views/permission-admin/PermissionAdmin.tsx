import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import axios from "axios";
import { Plus } from "lucide-react";

import { LoadingButton } from "@/components/LoadingButton";
import { ListPageCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import * as authApi from "@/lib/authApiClient";
import type { AdminMenuNode, KnownRole } from "@/types/permissionAdmin";

import AdminApiForbidden from "./AdminApiForbidden";
import MenuCatalogTab from "./MenuCatalogTab";
import RolePermissionsTab, { type RoleSaveActions } from "./RolePermissionsTab";

const PermissionAdmin: React.FC = () => {
  const { message } = useAppFeedback();
  const messageRef = useRef(message);
  messageRef.current = message;

  const [activeTab, setActiveTab] = useState("menus");
  const [role, setRole] = useState<KnownRole>("platform_admin");
  const openMenuCreateRef = useRef<(() => void) | null>(null);
  const [roleSaveActions, setRoleSaveActions] = useState<RoleSaveActions | null>(null);
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

  const handleSaveActionReady = useCallback((actions: RoleSaveActions | null) => {
    setRoleSaveActions(actions);
  }, []);

  if (menusForbidden) {
    return (
      <ListPageCard title="Permissions" description="Menu catalog and role permission mapping.">
        <div className="px-4">
          <AdminApiForbidden />
        </div>
      </ListPageCard>
    );
  }

  return (
    <ListPageCard
      title="Permissions"
      description="Menu catalog and role permission mapping."
      toolbar={
        activeTab === "menus" ? (
          <Button onClick={() => openMenuCreateRef.current?.()}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Create menu node
          </Button>
        ) : (
          <LoadingButton
            loading={roleSaveActions?.saving ?? false}
            disabled={roleSaveActions?.disabled ?? true}
            onClick={() => roleSaveActions?.save()}
          >
            Save
          </LoadingButton>
        )
      }
      filterRow={
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="menus" id="perm-tab-menus" aria-controls="perm-panel-menus">
              Menu catalog
            </TabsTrigger>
            <TabsTrigger value="roles" id="perm-tab-roles" aria-controls="perm-panel-roles">
              Role permissions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div id="perm-panel-menus" role="tabpanel" aria-labelledby="perm-tab-menus" hidden={activeTab !== "menus"}>
        <MenuCatalogTab
          menus={menus}
          menusLoading={menusLoading}
          menusForbidden={menusForbidden}
          reloadMenus={reloadMenus}
          onCreateActionReady={handleMenuCreateReady}
        />
      </div>
      <div id="perm-panel-roles" role="tabpanel" aria-labelledby="perm-tab-roles" hidden={activeTab !== "roles"}>
        <RolePermissionsTab
          menus={menus}
          menusLoading={menusLoading}
          menusForbidden={menusForbidden}
          role={role}
          onRoleCommitted={setRole}
          onSaveActionReady={handleSaveActionReady}
          onGoToCatalog={() => setActiveTab("menus")}
        />
      </div>
    </ListPageCard>
  );
};

export default PermissionAdmin;
