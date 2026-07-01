import React, { useEffect, useState } from 'react';
import type { AdminMenuNode, CreateMenuPayload, MenuNodeType, UpdateMenuPayload } from '@/types/permissionAdmin';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/loading-button';

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

const KEY_PATTERN = /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)*$/;

const MenuNodeFormModal: React.FC<MenuNodeFormModalProps> = ({
  open,
  mode,
  confirmLoading,
  menuParents,
  editingNode,
  onCancel,
  onSubmit,
}) => {
  const [values, setValues] = useState<MenuNodeFormValues>({
    key: '',
    label: '',
    type: 'action',
    parent_key: null,
    sort_order: 10,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MenuNodeFormValues, string>>>({});

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && editingNode) {
      setValues({
        key: editingNode.key,
        label: editingNode.label,
        type: editingNode.type,
        parent_key: editingNode.parent_key,
        sort_order: editingNode.sort_order,
      });
    } else {
      setValues({ key: '', label: '', type: 'action', parent_key: null, sort_order: 10 });
    }
    setErrors({});
  }, [open, mode, editingNode]);

  const validate = (): boolean => {
    const next: Partial<Record<keyof MenuNodeFormValues, string>> = {};
    if (mode === 'create') {
      if (!values.key.trim()) next.key = 'Key is required';
      else if (!KEY_PATTERN.test(values.key.trim())) {
        next.key = 'Use lowercase segments separated by colons (e.g. reports:export). Wildcards are not allowed.';
      }
    }
    if (!values.label.trim()) next.label = 'Label is required';
    if (values.sort_order < 0) next.sort_order = 'Sort order is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleOk = () => {
    if (!validate()) return;
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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add menu node' : 'Edit menu node'}</DialogTitle>
          <DialogDescription>Configure menu hierarchy, labels, and sort order.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field data-invalid={!!errors.key}>
            <FieldLabel htmlFor="menu-key">Key</FieldLabel>
            <Input
              id="menu-key"
              value={values.key}
              maxLength={256}
              placeholder="e.g. reports:export"
              disabled={mode === 'edit'}
              onChange={(e) => setValues((prev) => ({ ...prev, key: e.target.value }))}
            />
            {errors.key ? <FieldError>{errors.key}</FieldError> : null}
          </Field>

          <Field data-invalid={!!errors.label}>
            <FieldLabel htmlFor="menu-label">Label</FieldLabel>
            <Input
              id="menu-label"
              value={values.label}
              maxLength={256}
              onChange={(e) => setValues((prev) => ({ ...prev, label: e.target.value }))}
            />
            {errors.label ? <FieldError>{errors.label}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="menu-type">Type</FieldLabel>
            <Select
              value={values.type}
              disabled={mode === 'edit'}
              onValueChange={(value) => setValues((prev) => ({ ...prev, type: value as MenuNodeType }))}
            >
              <SelectTrigger id="menu-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="menu">Menu (group)</SelectItem>
                <SelectItem value="action">Action</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="menu-parent">Parent</FieldLabel>
            <Select
              value={values.parent_key ?? '__none__'}
              onValueChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  parent_key: value === '__none__' ? null : value,
                }))
              }
            >
              <SelectTrigger id="menu-parent" className="w-full">
                <SelectValue placeholder="None (top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None (top level)</SelectItem>
                {menuParents.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label} ({m.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={!!errors.sort_order}>
            <FieldLabel htmlFor="menu-sort">Sort order</FieldLabel>
            <Input
              id="menu-sort"
              type="number"
              min={0}
              value={values.sort_order}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
              }
            />
            {errors.sort_order ? <FieldError>{errors.sort_order}</FieldError> : null}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton loading={confirmLoading} onClick={handleOk}>
            {mode === 'create' ? 'Create' : 'Save'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MenuNodeFormModal;
