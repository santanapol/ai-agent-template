import React, { useMemo, useState } from 'react';
import { Card, Tabs } from 'antd';
import MenuCatalogTab from './MenuCatalogTab';
import RolePermissionsTab from './RolePermissionsTab';
import { PageContainer } from '../../components/layout';

const PermissionAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('menus');

  const tabItems = useMemo(
    () => [
      { key: 'menus', label: 'Menu catalog', children: <MenuCatalogTab /> },
      { key: 'roles', label: 'Role permissions', children: <RolePermissionsTab /> },
    ],
    [],
  );

  return (
    <PageContainer
      title="Permissions"
      description="Manage system menu catalog and role permissions mapping."
    >
      <Card>
        <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />
      </Card>
    </PageContainer>
  );
};

export default PermissionAdmin;
