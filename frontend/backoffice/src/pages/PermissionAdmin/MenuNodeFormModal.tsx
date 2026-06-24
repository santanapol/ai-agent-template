import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type { AdminMenuNode, CreateMenuPayload, MenuNodeType, UpdateMenuPayload } from '../../types/permissionAdmin';

export type MenuNodeFormMode = 'create' | 'edit';

export type MenuNodeFormValues = {
  key: string;
  label: string;
  type: MenuNodeType;
  parent_key: string | null;
  sort_order: number;
};

interface MenuNodeFormModalProps {
  open: boolean;
  mode: MenuNodeFormMode;
  confirmLoading: boolean;
  menuParents: AdminMenuNode[];
  editingNode: AdminMenuNode | null;
  onCancel: () => void;
  onSubmit: (values: CreateMenuPayload | UpdateMenuPayload, mode: MenuNodeFormMode) => void;
}

const MenuNodeFormModal: React.FC<MenuNodeFormModalProps> = ({
  open,
  mode,
  confirmLoading,
  menuParents,
  editingNode,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm<MenuNodeFormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && editingNode) {
      form.setFieldsValue({
        key: editingNode.key,
        label: editingNode.label,
        type: editingNode.type,
        parent_key: editingNode.parent_key,
        sort_order: editingNode.sort_order,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ type: 'action', parent_key: null, sort_order: 10 });
    }
  }, [open, mode, editingNode, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (mode === 'create') {
      onSubmit(
        {
          key: values.key.trim(),
          label: values.label.trim(),
          type: values.type,
          parent_key: values.parent_key ?? null,
          sort_order: values.sort_order,
        },
        mode,
      );
    } else {
      onSubmit(
        {
          label: values.label.trim(),
          parent_key: values.parent_key ?? null,
          sort_order: values.sort_order,
        },
        mode,
      );
    }
  };

  const parentOptions = menuParents.map((m) => ({ value: m.key, label: `${m.label} (${m.key})` }));

  return (
    <Modal
      title={mode === 'create' ? 'Add menu node' : 'Edit menu node'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      destroyOnHidden
      okText={mode === 'create' ? 'Create' : 'Save'}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Key"
          name="key"
          rules={[
            { required: true, message: 'Key is required' },
            {
              pattern: /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)*$/,
              message: 'Use lowercase segments separated by colons (e.g. reports:export). Wildcards are not allowed.',
            },
          ]}
        >
          <Input disabled={mode === 'edit'} placeholder="e.g. reports:export" maxLength={256} />
        </Form.Item>
        <Form.Item
          label="Label"
          name="label"
          rules={[{ required: true, message: 'Label is required' }]}
        >
          <Input maxLength={256} />
        </Form.Item>
        <Form.Item label="Type" name="type" rules={[{ required: true }]}>
          <Select
            disabled={mode === 'edit'}
            options={[
              { value: 'menu', label: 'Menu (group)' },
              { value: 'action', label: 'Action' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Parent" name="parent_key">
          <Select
            allowClear
            placeholder="None (top level)"
            options={parentOptions}
          />
        </Form.Item>
        <Form.Item
          label="Sort order"
          name="sort_order"
          rules={[{ required: true, message: 'Sort order is required' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MenuNodeFormModal;
