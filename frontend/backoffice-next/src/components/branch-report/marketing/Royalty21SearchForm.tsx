"use client";

import type React from "react";
import { useState } from "react";

import dayjs, { type Dayjs } from "dayjs";

import { DateFilterField } from "@/components/DateFilterField";
import { FilterSelectField } from "@/components/FilterSelectField";
import { type InlineFilterOption, InlineFilterSelect } from "@/components/list-page";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import {
  getRoyalty21DefaultSearchValues,
  isRegDateRangeValid,
  isRegDateRangeWithinMaxDays,
  MAX_REG_DATE_RANGE_DAYS,
} from "@/lib/branch-report/royalty21DateRange";
import { fieldErrorIds } from "@/lib/fieldA11y";
import type { ChannelType } from "@/types/branchReport";

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
  onInviteLinksOpen?: () => void;
}

const CHANNEL_TYPE_OPTIONS: InlineFilterOption[] = [
  { value: "affiliate_link", label: "Affiliate Link" },
  { value: "member_referral", label: "Member Referral" },
  { value: "direct", label: "Direct" },
];

const Royalty21SearchForm: React.FC<Royalty21SearchFormProps> = ({
  inviteLinkOptions,
  inviteLinksLoading,
  tableLoading = false,
  disabled = false,
  initialValues,
  onSearch,
  onClear,
  onInviteLinksOpen,
}) => {
  const defaults = getRoyalty21DefaultSearchValues();
  const [channelType, setChannelType] = useState<ChannelType>(initialValues?.channelType ?? defaults.channelType);
  const [inviteLinkId, setInviteLinkId] = useState<string | undefined>(initialValues?.inviteLinkId);
  const [regFrom, setRegFrom] = useState(
    initialValues?.regDateRange?.[0]?.format("YYYY-MM-DD") ?? defaults.regDateRange[0].format("YYYY-MM-DD"),
  );
  const [regTo, setRegTo] = useState(
    initialValues?.regDateRange?.[1]?.format("YYYY-MM-DD") ?? defaults.regDateRange[1].format("YYYY-MM-DD"),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const from = dayjs(regFrom);
    const to = dayjs(regTo);
    if (!isRegDateRangeValid(from, to)) {
      setError("Register To must be on or after Register From");
      return;
    }
    if (!isRegDateRangeWithinMaxDays(from, to)) {
      setError(`Register date range must not exceed ${MAX_REG_DATE_RANGE_DAYS} days`);
      return;
    }
    if (channelType === "affiliate_link" && !inviteLinkId) {
      setError("Please select affiliate link");
      return;
    }
    setError(null);
    onSearch({ channelType, inviteLinkId, regDateRange: [from, to] });
  };

  const handleClear = () => {
    const next = getRoyalty21DefaultSearchValues();
    setChannelType(next.channelType);
    setInviteLinkId(undefined);
    setRegFrom(next.regDateRange[0].format("YYYY-MM-DD"));
    setRegTo(next.regDateRange[1].format("YYYY-MM-DD"));
    setError(null);
    onClear();
  };

  const searchErrorA11y = error ? fieldErrorIds("royalty21-search") : undefined;
  const isDateError = error != null && (error.includes("Register") || error.includes("date range"));
  const isAffiliateError = error === "Please select affiliate link";

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <InlineFilterSelect
          id="royalty21-channel-type"
          prefix="Channel:"
          value={channelType}
          options={CHANNEL_TYPE_OPTIONS}
          disabled={disabled}
          onChange={(value) => {
            const next = value as ChannelType;
            setChannelType(next);
            if (next !== "affiliate_link") setInviteLinkId(undefined);
            if (next === "affiliate_link") onInviteLinksOpen?.();
          }}
        />

        {channelType === "affiliate_link" ? (
          <FilterSelectField
            id="royalty21-invite-link"
            label="Affiliate Link"
            placeholder="Select affiliate link"
            value={inviteLinkId}
            onChange={setInviteLinkId}
            options={inviteLinkOptions}
            width="w-full min-w-[12rem] sm:w-56"
            className="[&_[data-slot=field-label]]:sr-only"
            aria-invalid={isAffiliateError}
            aria-describedby={isAffiliateError ? searchErrorA11y?.describedBy : undefined}
          />
        ) : null}

        <DateFilterField
          id="royalty21-reg-from"
          label="From"
          value={regFrom}
          onChange={setRegFrom}
          className="w-[9.5rem]"
          aria-invalid={isDateError}
          aria-describedby={isDateError ? searchErrorA11y?.describedBy : undefined}
        />
        <DateFilterField
          id="royalty21-reg-to"
          label="To"
          value={regTo}
          onChange={setRegTo}
          className="w-[9.5rem]"
          aria-invalid={isDateError}
          aria-describedby={isDateError ? searchErrorA11y?.describedBy : undefined}
        />

        <Button type="submit" size="sm" disabled={disabled || tableLoading || inviteLinksLoading}>
          Search
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleClear} disabled={tableLoading}>
          Clear
        </Button>
      </div>

      {error ? (
        <FieldDescription id={searchErrorA11y?.errorId} className="text-destructive" role="alert">
          {error}
        </FieldDescription>
      ) : null}
    </form>
  );
};

export default Royalty21SearchForm;
