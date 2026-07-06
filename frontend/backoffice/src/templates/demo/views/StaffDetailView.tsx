import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FilterSelect } from '@/components/demo/filter-select';
import { LoadingButton } from '@/components/demo/loading-button';
import { ActiveBadge } from '@/components/demo/status-badge';
import { DescriptionList } from '@/components/demo/description-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DetailContainer, PageContentCard } from '../../index';
import { mockStaff, ROLE_OPTIONS } from '../mockData';
import { simulateSave } from '../helpers';
import type { DemoViewProps } from '../types';

const StaffDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedStaffId,
}) => {
  const [saving, setSaving] = useState(false);
  const selectedStaff = mockStaff.find((s) => s.id === selectedStaffId) ?? mockStaff[0];
  const [username] = useState(selectedStaff.username);
  const [role, setRole] = useState(selectedStaff.role);
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleBack = () => setDemoMode(detailReturnMode);

  const handleSave = async () => {
    if (!role) {
      setRoleError('Please select system role');
      return;
    }
    setRoleError(null);
    setSaving(true);
    try {
      await simulateSave();
      toast.success('Staff profile saved successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailContainer
      title={`Staff Profile: ${selectedStaff.firstname} ${selectedStaff.lastname}`}
      onBack={handleBack}
    >
      <PageContentCard className="max-w-[720px]">
        <DescriptionList
          title="Profile Metadata"
          items={[
            { label: 'Staff Code', value: selectedStaff.code },
            { label: 'Status', value: <ActiveBadge active={selectedStaff.active} /> },
            { label: 'First Name', value: selectedStaff.firstname },
            { label: 'Last Name', value: selectedStaff.lastname },
            { label: 'Email', value: selectedStaff.email },
            { label: 'Telephone', value: selectedStaff.tel },
          ]}
        />
      </PageContentCard>

      <PageContentCard className="max-w-[720px]" title="System Authorization">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input id="username" value={username} disabled />
          </Field>
          <Field data-invalid={!!roleError}>
            <FieldLabel htmlFor="role">System Role</FieldLabel>
            <FilterSelect
              id="role"
              placeholder="Select role"
              value={role}
              onChange={(v) => {
                setRole(v ?? '');
                if (roleError) setRoleError(null);
              }}
              options={ROLE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              width="w-full"
              aria-invalid={!!roleError}
              aria-describedby={roleError ? 'role-error' : undefined}
            />
            {roleError ? (
              <FieldDescription id="role-error" className="text-destructive">
                {roleError}
              </FieldDescription>
            ) : null}
          </Field>
          <div className="flex gap-2">
            <LoadingButton onClick={handleSave} loading={saving}>
              Save Changes
            </LoadingButton>
            <Button variant="outline" onClick={handleBack} disabled={saving}>
              Cancel
            </Button>
          </div>
        </FieldGroup>
      </PageContentCard>
    </DetailContainer>
  );
};

export default StaffDetailView;
