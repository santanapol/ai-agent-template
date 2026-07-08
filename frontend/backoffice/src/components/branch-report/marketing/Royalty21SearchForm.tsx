import React, { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type { ChannelType } from '@/types/branchReport';
import { DateFilterField } from '@/components/DateFilterField';
import { FilterSelectField } from '@/components/FilterSelectField';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  isRegDateRangeValid,
  isRegDateRangeWithinMaxDays,
  MAX_REG_DATE_RANGE_DAYS,
  getRoyalty21DefaultSearchValues,
} from '@/lib/branch-report/royalty21DateRange';

export interface Royalty21SearchValues {
  channelType: ChannelType;
  inviteLinkId?: string;
  regDateRange: [Dayjs, Dayjs];
}

export interface InviteLinkOption {
  value: string;
  label: string;
}

interface Royalty21SearchFormProps {
  inviteLinkOptions: InviteLinkOption[];
  inviteLinksLoading: boolean;
  tableLoading?: boolean;
  disabled?: boolean;
  initialValues?: Partial<Royalty21SearchValues>;
  onSearch: (values: Royalty21SearchValues) => void;
  onClear: () => void;
}

const CHANNEL_TYPE_OPTIONS = [
  { value: 'affiliate_link', label: 'Affiliate Link' },
  { value: 'member_referral', label: 'Member Referral' },
  { value: 'direct', label: 'Direct' },
];

const Royalty21SearchForm: React.FC<Royalty21SearchFormProps> = ({
  inviteLinkOptions,
  inviteLinksLoading,
  tableLoading = false,
  disabled = false,
  initialValues,
  onSearch,
  onClear,
}) => {
  const defaults = getRoyalty21DefaultSearchValues();
  const [channelType, setChannelType] = useState<ChannelType>(
    initialValues?.channelType ?? defaults.channelType,
  );
  const [inviteLinkId, setInviteLinkId] = useState<string | undefined>(
    initialValues?.inviteLinkId,
  );
  const [regFrom, setRegFrom] = useState(
    initialValues?.regDateRange?.[0]?.format('YYYY-MM-DD') ??
      defaults.regDateRange[0].format('YYYY-MM-DD'),
  );
  const [regTo, setRegTo] = useState(
    initialValues?.regDateRange?.[1]?.format('YYYY-MM-DD') ??
      defaults.regDateRange[1].format('YYYY-MM-DD'),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const from = dayjs(regFrom);
    const to = dayjs(regTo);
    if (!isRegDateRangeValid(from, to)) {
      setError('Register To must be on or after Register From');
      return;
    }
    if (!isRegDateRangeWithinMaxDays(from, to)) {
      setError(`Register date range must not exceed ${MAX_REG_DATE_RANGE_DAYS} days`);
      return;
    }
    if (channelType === 'affiliate_link' && !inviteLinkId) {
      setError('Please select affiliate link');
      return;
    }
    setError(null);
    onSearch({ channelType, inviteLinkId, regDateRange: [from, to] });
  };

  const handleClear = () => {
    const next = getRoyalty21DefaultSearchValues();
    setChannelType(next.channelType);
    setInviteLinkId(undefined);
    setRegFrom(next.regDateRange[0].format('YYYY-MM-DD'));
    setRegTo(next.regDateRange[1].format('YYYY-MM-DD'));
    setError(null);
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel>Channel Type</FieldLabel>
          <ToggleGroup
            value={[channelType]}
            onValueChange={(value) => {
              const next = value[0];
              if (!next) return;
              setChannelType(next as ChannelType);
              if (next !== 'affiliate_link') setInviteLinkId(undefined);
            }}
            disabled={disabled}
            className="flex flex-wrap"
          >
            {CHANNEL_TYPE_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.value} value={opt.value} size="sm" variant="outline">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        {channelType === 'affiliate_link' ? (
          <FilterSelectField
            id="royalty21-invite-link"
            label="Affiliate Link"
            placeholder="Select affiliate link"
            value={inviteLinkId}
            onChange={setInviteLinkId}
            options={inviteLinkOptions}
            width="w-full max-w-md"
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <DateFilterField
            id="royalty21-reg-from"
            label="From"
            value={regFrom}
            onChange={setRegFrom}
          />
          <DateFilterField
            id="royalty21-reg-to"
            label="To"
            value={regTo}
            onChange={setRegTo}
          />
        </div>

        {error ? (
          <Field data-invalid>
            <FieldError role="alert">{error}</FieldError>
          </Field>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={disabled || tableLoading || inviteLinksLoading}>
            Search
          </Button>
          <Button type="button" variant="outline" onClick={handleClear} disabled={tableLoading}>
            Clear
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};

export default Royalty21SearchForm;
