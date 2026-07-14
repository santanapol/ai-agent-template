"use client";

import type React from "react";
import { useState } from "react";

import dayjs, { type Dayjs } from "dayjs";

import { DateFilterField } from "@/components/DateFilterField";
import { FilterSelectField } from "@/components/FilterSelectField";
import { type InlineFilterOption, InlineFilterSelect } from "@/components/list-page";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  referralUsername?: string;
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
  onInviteLinkSearchQueryChange?: (query: string) => void;
}

const CHANNEL_TYPE_OPTIONS: InlineFilterOption[] = [
  { value: "affiliate_link", label: "Affiliate Link" },
  { value: "member_referral", label: "Member Referral" },
  { value: "direct", label: "Direct" },
];

const REFERRAL_REQUIRED_ERROR = "Enter the referring member’s exact username";
const AFFILIATE_REQUIRED_ERROR = "Please select affiliate link";

function focusField(id: string) {
  queueMicrotask(() => {
    document.getElementById(id)?.focus();
  });
}

const Royalty21SearchForm: React.FC<Royalty21SearchFormProps> = ({
  inviteLinkOptions,
  inviteLinksLoading,
  tableLoading = false,
  disabled = false,
  initialValues,
  onSearch,
  onClear,
  onInviteLinksOpen,
  onInviteLinkSearchQueryChange,
}) => {
  const defaults = getRoyalty21DefaultSearchValues();
  const [channelType, setChannelType] = useState<ChannelType>(initialValues?.channelType ?? defaults.channelType);
  const [inviteLinkId, setInviteLinkId] = useState<string | undefined>(initialValues?.inviteLinkId);
  const [referralUsername, setReferralUsername] = useState(initialValues?.referralUsername ?? "");
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
      setError("Register to must be on or after Register from");
      focusField("royalty21-reg-to");
      return;
    }
    if (!isRegDateRangeWithinMaxDays(from, to)) {
      setError(`Register date range must not exceed ${MAX_REG_DATE_RANGE_DAYS} days`);
      focusField("royalty21-reg-from");
      return;
    }
    if (channelType === "affiliate_link" && !inviteLinkId) {
      setError(AFFILIATE_REQUIRED_ERROR);
      focusField("royalty21-invite-link");
      return;
    }
    const trimmedUsername = referralUsername.trim();
    if (channelType === "member_referral" && !trimmedUsername) {
      setError(REFERRAL_REQUIRED_ERROR);
      focusField("royalty21-referring-member");
      return;
    }
    setError(null);
    onSearch({
      channelType,
      inviteLinkId,
      referralUsername: channelType === "member_referral" ? trimmedUsername : undefined,
      regDateRange: [from, to],
    });
  };

  const handleClear = () => {
    const next = getRoyalty21DefaultSearchValues();
    setChannelType(next.channelType);
    setInviteLinkId(undefined);
    setReferralUsername("");
    setRegFrom(next.regDateRange[0].format("YYYY-MM-DD"));
    setRegTo(next.regDateRange[1].format("YYYY-MM-DD"));
    setError(null);
    onClear();
  };

  const searchErrorA11y = error ? fieldErrorIds("royalty21-search") : undefined;
  const isDateError = error != null && (error.includes("Register") || error.includes("date range"));
  const isAffiliateError = error === AFFILIATE_REQUIRED_ERROR;
  const isReferralError = error === REFERRAL_REQUIRED_ERROR;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field className="w-fit">
          <FieldLabel htmlFor="royalty21-channel-type">Channel</FieldLabel>
          <InlineFilterSelect
            id="royalty21-channel-type"
            value={channelType}
            options={CHANNEL_TYPE_OPTIONS}
            disabled={disabled}
            onChange={(value) => {
              const next = value as ChannelType;
              setChannelType(next);
              if (next !== "affiliate_link") setInviteLinkId(undefined);
              if (next !== "member_referral") setReferralUsername("");
              if (next === "affiliate_link") onInviteLinksOpen?.();
            }}
          />
        </Field>

        {channelType === "affiliate_link" ? (
          <FilterSelectField
            id="royalty21-invite-link"
            label="Affiliate Link"
            placeholder="Select affiliate link"
            value={inviteLinkId}
            onChange={(next) => {
              setInviteLinkId(next);
              if (next && error === AFFILIATE_REQUIRED_ERROR) setError(null);
            }}
            options={inviteLinkOptions}
            includeAllOption={false}
            searchable
            serverSearch
            searchPlaceholder="Search affiliate links…"
            emptyMessage="No affiliate links found"
            loading={inviteLinksLoading}
            onOpen={onInviteLinksOpen}
            onSearchQueryChange={onInviteLinkSearchQueryChange}
            width="w-full min-w-[12rem] sm:w-56"
            aria-invalid={isAffiliateError}
            aria-describedby={isAffiliateError ? searchErrorA11y?.describedBy : undefined}
          />
        ) : null}

        {channelType === "member_referral" ? (
          <Field className="w-full min-w-[12rem] sm:w-56">
            <FieldLabel htmlFor="royalty21-referring-member">Referring member</FieldLabel>
            <Input
              id="royalty21-referring-member"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Exact username"
              value={referralUsername}
              disabled={disabled}
              aria-invalid={isReferralError}
              aria-describedby={
                [isReferralError ? searchErrorA11y?.describedBy : null, "royalty21-referring-member-hint"]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={(e) => {
                setReferralUsername(e.target.value);
                if (e.target.value.trim() && error === REFERRAL_REQUIRED_ERROR) {
                  setError(null);
                }
              }}
            />
            <span id="royalty21-referring-member-hint" className="sr-only">
              Exact match only
            </span>
          </Field>
        ) : null}

        <DateFilterField
          id="royalty21-reg-from"
          label="Register from"
          value={regFrom}
          onChange={setRegFrom}
          className="w-[10.5rem]"
          aria-invalid={isDateError}
          aria-describedby={isDateError ? searchErrorA11y?.describedBy : undefined}
        />
        <DateFilterField
          id="royalty21-reg-to"
          label="Register to"
          value={regTo}
          onChange={setRegTo}
          className="w-[10.5rem]"
          aria-invalid={isDateError}
          aria-describedby={isDateError ? searchErrorA11y?.describedBy : undefined}
        />

        <Button type="submit" size="sm" disabled={disabled || tableLoading}>
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
