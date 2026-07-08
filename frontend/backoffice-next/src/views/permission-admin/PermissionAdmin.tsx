import type React from "react";
import { useCallback, useRef, useState } from "react";

import { Plus } from "lucide-react";

import { ListPageCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import MenuCatalogTab from "./MenuCatalogTab";
import RolePermissionsTab from "./RolePermissionsTab";

const PermissionAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState("menus");
  const openMenuCreateRef = useRef<(() => void) | null>(null);

  const handleMenuCreateReady = useCallback((openCreate: () => void) => {
    openMenuCreateRef.current = openCreate;
  }, []);

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
        <TabsContent value="menus" className="mt-4">
          {activeTab === "menus" ? <MenuCatalogTab onCreateActionReady={handleMenuCreateReady} /> : null}
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          {activeTab === "roles" ? <RolePermissionsTab /> : null}
        </TabsContent>
      </Tabs>
    </ListPageCard>
  );
};

export default PermissionAdmin;
