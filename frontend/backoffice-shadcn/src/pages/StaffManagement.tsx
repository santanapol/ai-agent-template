import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageContainer, PageContentCard, FiltersContainer } from '@/components/layout';
import StaffTable from '@/components/staff/StaffTable';
import StaffDrawerComponent, {
  type DrawerFormValues,
  type DrawerMode,
} from '@/components/staff/StaffDrawer';
import { FilterSelectField } from '@/components/filter-select-field';
import { SearchFilterField } from '@/components/search-filter-field';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { usePermission } from '@/hooks/usePermission';
import { apiErrorMessage } from '@/lib/apiError';
import {
  confirmPasswordRule,
  passwordFieldRules,
} from '@/lib/passwordPolicy';
import * as staffApi from '@/lib/staffApiClient';
import { formatTelephoneToE164, telephoneRules } from '@/lib/telephone';
import type { PatchProfilePayload, ProfileStatus, StaffProfile } from '@/types/staff';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

const emptyForm: DrawerFormValues = {
  code: '',
  firstname: '',
  lastname: '',
  email: '',
  tel: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: 'staff',
};

function validateField(field: keyof DrawerFormValues, values: DrawerFormValues): string | undefined {
  const v = values[field];
  if (field === 'code' && !v?.trim()) return 'Please enter staff code';
  if (field === 'firstname' && !v?.trim()) return 'Please enter first name';
  if (field === 'lastname' && !v?.trim()) return 'Please enter last name';
  if (field === 'email') {
    if (!v?.trim()) return 'Please enter a valid email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email';
  }
  if (field === 'tel') {
    for (const rule of telephoneRules) {
      if (typeof rule === 'object' && 'validator' in rule) {
        const result = (rule as { validator: (_: unknown, val: string) => Promise<void> }).validator(
          null,
          v ?? '',
        );
        if (result && typeof (result as Promise<void>).then === 'function') {
          // sync check only for simple required
        }
      }
    }
  }
  if (field === 'username' && values.password !== undefined) {
    if (!v?.trim()) return 'Please enter username';
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Only English letters, numbers, and underscores allowed';
  }
  if (field === 'password' && values.username !== undefined) {
    for (const rule of passwordFieldRules) {
      if (typeof rule === 'object' && 'min' in rule && (v?.length ?? 0) < (rule.min as number)) {
        return `Password must be at least ${rule.min} characters`;
      }
    }
  }
  if (field === 'confirmPassword' && values.password) {
    const rule = confirmPasswordRule(() => values.password ?? '');
    if (typeof rule === 'object' && 'validator' in rule) {
      // simplified
      if (v !== values.password) return 'Passwords do not match';
    }
  }
  return undefined;
}

const StaffManagement: React.FC = () => {
  const { user } = useAuth();
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [formValues, setFormValues] = useState<DrawerFormValues>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DrawerFormValues, string>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState({ current: 1, pageSize: 20, total: 0 });
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProfileStatus>('active');
  const [refreshToken, setRefreshToken] = useState(0);
  const currentEtag = useRef<string | null>(null);
  const canCreate = usePermission('profiles:create');
  const canEdit = usePermission('profiles:edit');
  const canAssignRole = usePermission('roles:assign');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setPaginationConfig((prev) => ({ ...prev, current: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const { current: currentPage, pageSize } = paginationConfig;
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTableLoading(true);
      try {
        const res = await staffApi.listProfiles({
          q: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          limit: pageSize,
          sort: '-upd_date',
        });
        if (cancelled) return;
        setProfiles(res.data);
        setPaginationConfig((prev) => ({ ...prev, total: res.pagination?.total ?? prev.total }));
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, 'Failed to load profiles'));
      } finally {
        if (!cancelled) setTableLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, message, statusFilter, currentPage, pageSize, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  const handleFieldChange = (field: keyof DrawerFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleOpenDrawer = useCallback(
    async (mode: DrawerMode, record?: StaffProfile) => {
      setDrawerMode(mode);
      setIsDrawerOpen(true);
      currentEtag.current = null;
      setFormErrors({});

      if (!record || mode === 'create') {
        setEditingId(null);
        setEditingUserId(null);
        setFormValues({ ...emptyForm, role: 'staff' });
        return;
      }

      setEditingId(record.id);
      setEditingUserId(record.user_id);

      if (mode === 'view') {
        setFormValues({
          code: record.code,
          firstname: record.firstname,
          lastname: record.lastname,
          email: record.email,
          tel: record.tel,
          role: record.user?.role,
        });
        return;
      }

      setDrawerLoading(true);
      try {
        const { profile, etag } = await staffApi.getProfileById(record.id);
        currentEtag.current = etag;
        setFormValues({
          code: profile.code,
          firstname: profile.firstname,
          lastname: profile.lastname,
          email: profile.email,
          tel: profile.tel,
          role: profile.user?.role,
        });
      } catch (err) {
        message.error(apiErrorMessage(err, 'Failed to load profile'));
        setIsDrawerOpen(false);
      } finally {
        setDrawerLoading(false);
      }
    },
    [message],
  );

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setFormValues(emptyForm);
    currentEtag.current = null;
    setEditingId(null);
    setEditingUserId(null);
  }, []);

  const showAdminResetPassword =
    drawerMode === 'edit' && editingUserId !== null && user?.sub !== undefined && editingUserId !== user.sub;

  const validateForm = (isCreate: boolean): boolean => {
    const fields: (keyof DrawerFormValues)[] = isCreate
      ? ['code', 'firstname', 'lastname', 'email', 'tel', 'username', 'password', 'confirmPassword']
      : ['firstname', 'lastname', 'email', 'tel'];
    const errors: Partial<Record<keyof DrawerFormValues, string>> = {};
    fields.forEach((f) => {
      const err = validateField(f, formValues);
      if (err) errors[f] = err;
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePassword = useCallback(async () => {
    if (!editingId) return;
    const newPassword = formValues.newPassword?.trim();
    if (!newPassword) {
      message.warning('Enter a new password to update, or leave the fields empty.');
      return;
    }
    if (formValues.confirmNewPassword !== newPassword) {
      message.error('Passwords do not match');
      return;
    }
    await confirm({
      title: 'Reset password?',
      content: 'This will sign the user out of all devices.',
      okText: 'Update password',
      onOk: async () => {
        setUpdatingPassword(true);
        try {
          await staffApi.resetProfilePassword(editingId, { password: newPassword, revoke_sessions: true });
          message.success('Password updated');
          setFormValues((prev) => ({ ...prev, newPassword: '', confirmNewPassword: '' }));
        } catch (err) {
          message.error(apiErrorMessage(err, 'Failed to update password'));
        } finally {
          setUpdatingPassword(false);
        }
      },
    });
  }, [confirm, editingId, formValues.confirmNewPassword, formValues.newPassword, message]);

  const handleSave = useCallback(async () => {
    const isCreate = drawerMode === 'create';
    if (!validateForm(isCreate)) return;

    setIsSaving(true);
    try {
      if (isCreate) {
        await staffApi.createProfile({
          code: formValues.code!,
          firstname: formValues.firstname!,
          lastname: formValues.lastname!,
          email: formValues.email!,
          tel: formatTelephoneToE164(formValues.tel!),
          username: formValues.username!,
          password: formValues.password!,
          ...(canAssignRole && formValues.role ? { role: formValues.role } : {}),
        });
        message.success('Profile created');
        handleCloseDrawer();
        setPaginationConfig((prev) => ({ ...prev, current: 1 }));
        refresh();
        return;
      }

      if (editingId && currentEtag.current) {
        const payload: PatchProfilePayload = {
          firstname: formValues.firstname!,
          lastname: formValues.lastname!,
          email: formValues.email!,
          tel: formatTelephoneToE164(formValues.tel!),
        };
        await staffApi.patchProfile(editingId, payload, currentEtag.current);
        const existingRecord = profiles.find((p) => p.id === editingId);
        if (canAssignRole && formValues.role && formValues.role !== existingRecord?.user?.role) {
          await staffApi.changeProfileRole(editingId, formValues.role);
        }
        message.success('Profile updated');
        handleCloseDrawer();
        refresh();
      } else if (!currentEtag.current) {
        message.error('Cannot save: version token missing. Please close and reopen the form.');
      }
    } catch (err) {
      message.error(apiErrorMessage(err, isCreate ? 'Failed to create profile' : 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  }, [canAssignRole, drawerMode, editingId, formValues, handleCloseDrawer, message, profiles, refresh]);

  const handleArchive = useCallback(
    (record: StaffProfile) => {
      void confirm({
        title: 'Archive Staff Profile?',
        content:
          'Are you sure you want to archive this staff member? Their active session will be revoked immediately.',
        okText: 'Archive',
        danger: true,
        onOk: async () => {
          const { etag } = await staffApi.getProfileById(record.id);
          if (!etag) throw new Error('Could not determine current profile version');
          await staffApi.archiveProfile(record.id, etag);
          message.success('Profile archived');
          refresh();
        },
      });
    },
    [confirm, message, refresh],
  );

  const handleRestore = useCallback(
    (record: StaffProfile) => {
      void confirm({
        title: 'Restore Staff Profile?',
        content: 'This profile will become active again.',
        okText: 'Restore',
        onOk: async () => {
          const { etag } = await staffApi.getProfileById(record.id);
          if (!etag) throw new Error('Could not determine current profile version');
          await staffApi.restoreProfile(record.id, etag);
          message.success('Profile restored');
          refresh();
        },
      });
    },
    [confirm, message, refresh],
  );

  return (
    <>
      <PageContainer
        title="Staff Management"
        description="Manage staff profiles, system roles, and authentication credentials."
        extra={
          canCreate ? (
            <Button onClick={() => void handleOpenDrawer('create')}>
              <Plus data-icon="inline-start" />
              Add New Staff
            </Button>
          ) : undefined
        }
      >
        <PageContentCard>
          <FiltersContainer>
            <SearchFilterField
              id="staff-search"
              label="Search"
              placeholder="Search code, name..."
              value={rawSearch}
              onChange={setRawSearch}
            />
            <FilterSelectField
              id="staff-status"
              label="Status"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter((v as ProfileStatus) ?? 'active');
                setPaginationConfig((prev) => ({ ...prev, current: 1 }));
              }}
              options={STATUS_OPTIONS}
              placeholder="Filter by status"
              width="w-[160px]"
            />
          </FiltersContainer>
          <StaffTable
            profiles={profiles}
            loading={tableLoading}
            pagination={paginationConfig}
            onView={(record) => void handleOpenDrawer('view', record)}
            onEdit={canEdit ? (record) => void handleOpenDrawer('edit', record) : undefined}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onTableChange={(page, size) => setPaginationConfig((prev) => ({ ...prev, current: page, pageSize: size }))}
          />
        </PageContentCard>
      </PageContainer>

      <StaffDrawerComponent
        open={isDrawerOpen}
        mode={drawerMode}
        loading={drawerLoading}
        isSaving={isSaving}
        updatingPassword={updatingPassword}
        showAdminResetPassword={showAdminResetPassword}
        canAssignRole={canAssignRole}
        values={formValues}
        errors={formErrors}
        onChange={handleFieldChange}
        onClose={handleCloseDrawer}
        onSave={() => void handleSave()}
        onSwitchToEdit={() => {
          const record = profiles.find((p) => p.id === editingId);
          if (record) void handleOpenDrawer('edit', record);
          else message.error('Profile not found in current list. Please refresh.');
        }}
        onUpdatePassword={() => void handleUpdatePassword()}
      />
    </>
  );
};

export default StaffManagement;
