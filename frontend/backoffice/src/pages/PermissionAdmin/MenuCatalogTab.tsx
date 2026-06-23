import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Empty, Flex, Popconfirm, Skeleton, Space, Tooltip, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { AdminMenuNode, CreateMenuPayload, UpdateMenuPayload } from '../../types/permissionAdmin';
import * as authApi from '../../lib/authApiClient';
import { apiErrorMessage } from '../../lib/apiError';
import { useAppFeedback } from '../../hooks/useAppFeedback';
import { buildMenuTree, isProtectedMenuKey, type MenuTreeNode } from './permissionAdminUtils';
import AdminApiForbidden from './AdminApiForbidden';
import MenuNodeFormModal, { type MenuNodeFormMode } from './MenuNodeFormModal';

const { Text } = Typography;

function mapTreeToDataNodes(
  nodes: MenuTreeNode[],
  handlers: {
    onEdit: (node: AdminMenuNode) => void;
    onDelete: (node: AdminMenuNode) => void;
  },
): DataNode[] {
  return nodes.map((node) => ({
    key: node.key,
    title: (
      <Flex align="center" justify="space-between" gap={8} style={{ width: '100%' }}>
        <Space size={4}>
          <Text>{node.label}</Text>
          <Text type="secondary">({node.key})</Text>
        </Space>
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip
            title={
              isProtectedMenuKey(node.key)
                ? 'This node is protected and cannot be modified.'
                : undefined
            }
          >
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              aria-label={`Edit ${node.label}`}
              disabled={isProtectedMenuKey(node.key)}
              onClick={() => handlers.onEdit(node)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this menu node?"
            description="This cannot be undone if the node has no children or references."
            okText="Delete"
            okButtonProps={{ danger: true }}
            disabled={isProtectedMenuKey(node.key)}
            onConfirm={() => handlers.onDelete(node)}
          >
            <Tooltip
              title={
                isProtectedMenuKey(node.key)
                  ? 'This node is protected and cannot be deleted.'
                  : undefined
              }
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Delete ${node.label}`}
                disabled={isProtectedMenuKey(node.key)}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      </Flex>
    ),
    children: node.children?.length
      ? mapTreeToDataNodes(node.children, handlers)
      : undefined,
  }));
}

const MenuCatalogTab: React.FC = () => {
  const { message } = useAppFeedback();
  const [menus, setMenus] = useState<AdminMenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<MenuNodeFormMode>('create');
  const [editingNode, setEditingNode] = useState<AdminMenuNode | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const data = await authApi.listAdminMenus();
      setMenus(data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setForbidden(true);
        return;
      }
      message.error(apiErrorMessage(err, 'Failed to load menu catalog'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial catalog fetch on mount
    void loadMenus();
  }, [loadMenus]);

  const menuParents = useMemo(
    () => menus.filter((m) => m.type === 'menu').sort((a, b) => a.sort_order - b.sort_order),
    [menus],
  );

  const treeData = useMemo(() => {
    const tree = buildMenuTree(menus);
    return mapTreeToDataNodes(tree, {
      onEdit: (node) => {
        setModalMode('edit');
        setEditingNode(node);
        setModalOpen(true);
      },
      onDelete: async (node) => {
        try {
          await authApi.deleteAdminMenu(node.key, node.upd_date);
          message.success('Menu node deleted');
          await loadMenus();
        } catch (err) {
          message.error(apiErrorMessage(err, 'Failed to delete menu node'));
        }
      },
    });
  }, [menus, loadMenus, message]);

  const openCreate = () => {
    setModalMode('create');
    setEditingNode(null);
    setModalOpen(true);
  };

  const handleSubmit = async (
    values: CreateMenuPayload | UpdateMenuPayload,
    mode: MenuNodeFormMode,
  ) => {
    setSaving(true);
    try {
      if (mode === 'create') {
        await authApi.createAdminMenu(values as CreateMenuPayload);
        message.success('Menu node created');
      } else if (editingNode) {
        await authApi.updateAdminMenu(editingNode.key, values as UpdateMenuPayload, editingNode.upd_date);
        message.success('Menu node updated');
      }
      setModalOpen(false);
      await loadMenus();
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to save menu node'));
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return <AdminApiForbidden />;
  }

  return (
    <div data-testid="menu-catalog-tab">
      <Flex justify="flex-end" style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add node
        </Button>
      </Flex>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : menus.length === 0 ? (
        <Empty description="No menu nodes in registry" />
      ) : (
        <Tree showLine defaultExpandAll treeData={treeData} selectable={false} />
      )}

      <MenuNodeFormModal
        open={modalOpen}
        mode={modalMode}
        confirmLoading={saving}
        menuParents={menuParents}
        editingNode={editingNode}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default MenuCatalogTab;
