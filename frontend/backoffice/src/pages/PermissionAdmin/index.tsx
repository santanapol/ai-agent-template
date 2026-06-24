import React, { useMemo, useState } from 'react';
import { Card, Tabs, Typography } from 'antd';
import MenuCatalogTab from './MenuCatalogTab';
import RolePermissionsTab from './RolePermissionsTab';

const { Title } = Typography;

const PermissionAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('menus');

  const tabItems = useMemo(
    () => [
      { key: 'menus', label: 'Menu catalog' },
      { key: 'roles', label: 'Role permissions' },
    ],
    [],
  );

  return (
    <div>
      <Title level={2} style={{ marginBottom: 16 }}>
        Permissions
      </Title>
      <Card>
        <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />
        {activeTab === 'menus' ? <MenuCatalogTab /> : <RolePermissionsTab />}
      </Card>
    </div>
  );
};

export default PermissionAdmin;
