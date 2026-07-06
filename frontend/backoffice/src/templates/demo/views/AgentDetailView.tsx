import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FilterSelect } from '@/components/demo/filter-select';
import { LoadingButton } from '@/components/demo/loading-button';
import { StatusBadge } from '@/components/demo/status-badge';
import { DescriptionList } from '@/components/demo/description-list';
import { DetailContainer, PageContentCard } from '../../index';
import { mockAgents } from '../mockData';
import { getAgentStatusVariant, simulateSave } from '../helpers';
import type { DemoViewProps } from '../types';

const AgentDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedAgentId,
}) => {
  const [saving, setSaving] = useState(false);
  const agent = mockAgents.find((a) => a.id === selectedAgentId) ?? mockAgents[0];
  const [commissionRate, setCommissionRate] = useState(String(agent.commission_rate));
  const [status, setStatus] = useState(agent.status);
  const [contractNote, setContractNote] = useState('Standard partner agreement valid until 2026-12-31.');
  const [commissionError, setCommissionError] = useState<string | null>(null);

  const handleBack = () => setDemoMode(detailReturnMode);

  const handleSave = async () => {
    const rate = Number(commissionRate);
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setCommissionError('Commission rate must be between 0 and 100');
      return;
    }
    setCommissionError(null);
    setSaving(true);
    try {
      await simulateSave();
      toast.success('Agent settings saved successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailContainer
      title={`Agent Details: ${agent.agent_name}`}
      onBack={handleBack}
    >
      <PageContentCard className="max-w-[720px]">
        <DescriptionList
          title="Agent Overview"
          items={[
            { label: 'Agent Code', value: agent.agent_code },
            {
              label: 'Status',
              value: <StatusBadge status={agent.status} variant={getAgentStatusVariant(agent.status)} />,
            },
            { label: 'Agent Name', value: agent.agent_name },
            { label: 'Branch Count', value: agent.branch_count },
            { label: 'Contact Name', value: agent.contact_name },
            { label: 'Commission Rate', value: `${agent.commission_rate.toFixed(1)}%` },
            { label: 'Email', value: agent.email },
            { label: 'Telephone', value: agent.tel },
          ]}
        />
      </PageContentCard>

      <PageContentCard className="max-w-[720px]" title="Partnership Settings">
        <FieldGroup>
          <Field data-invalid={!!commissionError}>
            <FieldLabel htmlFor="commission">Commission Rate (%)</FieldLabel>
            <Input
              id="commission"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={commissionRate}
              onChange={(e) => {
                setCommissionRate(e.target.value);
                if (commissionError) setCommissionError(null);
              }}
              disabled={saving}
              aria-invalid={!!commissionError}
              aria-describedby={commissionError ? 'commission-error' : undefined}
            />
            {commissionError ? (
              <FieldDescription id="commission-error" className="text-destructive">
                {commissionError}
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="agent-status">Status</FieldLabel>
            <FilterSelect
              id="agent-status"
              placeholder="Status"
              value={status}
              onChange={(v) => setStatus(v ?? agent.status)}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
              width="w-full"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="contract">Contract Note</FieldLabel>
            <Textarea
              id="contract"
              rows={3}
              value={contractNote}
              onChange={(e) => setContractNote(e.target.value)}
              disabled={saving}
            />
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

export default AgentDetailView;
