import React, { useState } from 'react';
import { PageContainer, PageContentCard } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MenuCatalogTab from './MenuCatalogTab';
import RolePermissionsTab from './RolePermissionsTab';

const PermissionAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('menus');

  return (
    <PageContainer
      title="Permissions"
      description="Manage system menu catalog and role permissions mapping."
    >
      <PageContentCard>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="menus">Menu catalog</TabsTrigger>
            <TabsTrigger value="roles">Role permissions</TabsTrigger>
          </TabsList>
          <TabsContent value="menus" className="mt-4">
            {activeTab === 'menus' ? <MenuCatalogTab /> : null}
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            {activeTab === 'roles' ? <RolePermissionsTab /> : null}
          </TabsContent>
        </Tabs>
      </PageContentCard>
    </PageContainer>
  );
};

export default PermissionAdmin;
