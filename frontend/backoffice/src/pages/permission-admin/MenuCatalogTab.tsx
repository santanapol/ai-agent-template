import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminMenuNode, CreateMenuPayload, UpdateMenuPayload } from '@/types/permissionAdmin';
import * as authApi from '@/lib/authApiClient';
import { apiErrorMessage } from '@/lib/apiError';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { MenuTree } from '@/components/MenuTree';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { buildMenuTree, isProtectedMenuKey } from './permissionAdminUtils';
import AdminApiForbidden from './AdminApiForbidden';
import MenuNodeFormModal, { type MenuNodeFormMode } from './MenuNodeFormModal';

const MenuCatalogTab: React.FC = () => {
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
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
    void loadMenus();
  }, [loadMenus]);

  const menuParents = useMemo(
    () => menus.filter((m) => m.type === 'menu').sort((a, b) => a.sort_order - b.sort_order),
    [menus],
  );

  const treeNodes = useMemo(() => buildMenuTree(menus), [menus]);

  const openCreate = () => {
    setModalMode('create');
    setEditingNode(null);
    setModalOpen(true);
  };

  const handleDelete = (node: AdminMenuNode) => {
    void confirm({
      title: 'Delete this menu node?',
      content: 'This cannot be undone if the node has no children or references.',
      okText: 'Delete',
      danger: true,
      onOk: async () => {
        try {
          await authApi.deleteAdminMenu(node.key, node.upd_date);
          message.success('Menu node deleted');
          await loadMenus();
        } catch (err) {
          message.error(apiErrorMessage(err, 'Failed to delete menu node'));
          throw err;
        }
      },
    });
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
        await authApi.updateAdminMenu(
          editingNode.key,
          values as UpdateMenuPayload,
          editingNode.upd_date,
        );
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
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Create menu node
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" aria-busy="true" />
      ) : menus.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No menu nodes in registry</EmptyTitle>
            <EmptyDescription>Add a node to build the menu catalog.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              Create menu node
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <MenuTree
          nodes={treeNodes}
          defaultExpanded
          renderActions={(node) => {
            const protectedNode = isProtectedMenuKey(node.key);
            return (
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Edit ${node.label}`}
                        disabled={protectedNode}
                        onClick={() => {
                          setModalMode('edit');
                          setEditingNode(node);
                          setModalOpen(true);
                        }}
                      />
                    }
                  >
                    <Pencil data-icon="inline-start" aria-hidden="true" />
                  </TooltipTrigger>
                  {protectedNode ? (
                    <TooltipContent>This node is protected and cannot be modified.</TooltipContent>
                  ) : null}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Delete ${node.label}`}
                        disabled={protectedNode}
                        onClick={() => handleDelete(node)}
                      />
                    }
                  >
                    <Trash2 data-icon="inline-start" className="text-destructive" aria-hidden="true" />
                  </TooltipTrigger>
                  {protectedNode ? (
                    <TooltipContent>This node is protected and cannot be deleted.</TooltipContent>
                  ) : null}
                </Tooltip>
              </div>
            );
          }}
        />
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
