import React, { useMemo } from 'react';
import { Card, Tabs, Typography } from 'antd';
import MenuCatalogTab from './MenuCatalogTab';
import RolePermissionsTab from './RolePermissionsTab';

const { Title } = Typography;

const PermissionAdmin: React.FC = () => {
  const tabItems = useMemo(
    () => [
      {
        key: 'menus',
        label: 'Menu catalog',
        children: <MenuCatalogTab />,
      },
      {
        key: 'roles',
        label: 'Role permissions',
        children: <RolePermissionsTab />,
      },
    ],
    [],
  );

  return (
    <div>
      <Title level={2} style={{ marginBottom: 16 }}>
        Permissions
      </Title>
      <Card>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
};

export default PermissionAdmin;
