import { Save } from "lucide-react";

import { DescriptionList } from "@/components/DescriptionList";
import { LoadingButton } from "@/components/LoadingButton";
import { PageContentCard } from "@/components/layout";
import { UserAvatar } from "@/components/UserAvatar";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldErrorIds } from "@/lib/fieldA11y";
import type { StaffProfile } from "@/types/staff";

interface ProfileDetailsCardProps {
  profile: StaffProfile;
  code: string;
  firstname: string;
  lastname: string;
  email: string;
  tel: string;
  errors: Record<string, string>;
  saving: boolean;
  onFirstnameChange: (value: string) => void;
  onLastnameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onTelChange: (value: string) => void;
  onSave: () => void;
}

export function ProfileDetailsCard({
  profile,
  code,
  firstname,
  lastname,
  email,
  tel,
  errors,
  saving,
  onFirstnameChange,
  onLastnameChange,
  onEmailChange,
  onTelChange,
  onSave,
}: ProfileDetailsCardProps) {
  const displayName = [profile.firstname, profile.lastname].filter(Boolean).join(" ") || profile.user.username;
  const firstnameA11y = errors.firstname ? fieldErrorIds("firstname") : undefined;
  const lastnameA11y = errors.lastname ? fieldErrorIds("lastname") : undefined;
  const emailA11y = errors.email ? fieldErrorIds("email") : undefined;
  const telA11y = errors.tel ? fieldErrorIds("tel") : undefined;

  return (
    <PageContentCard className="max-w-[720px]">
      <div className="mb-6 flex items-center gap-4">
        <UserAvatar
          size={64}
          firstname={profile.firstname}
          lastname={profile.lastname}
          username={profile.user.username}
        />
        <div>
          <p className="font-semibold text-lg">{displayName}</p>
          <p className="text-muted-foreground text-sm">{profile.user.username}</p>
        </div>
      </div>

      <DescriptionList
        items={[
          { label: "Login username", value: profile.user.username },
          { label: "System role", value: profile.user.role },
          { label: "Status", value: profile.status },
        ]}
        className="mb-6"
      />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="code">Staff Code</FieldLabel>
          <Input id="code" value={code} disabled placeholder="e.g. EMP-001" maxLength={32} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={!!errors.firstname}>
            <FieldLabel htmlFor="firstname">First Name</FieldLabel>
            <Input
              id="firstname"
              value={firstname}
              onChange={(e) => onFirstnameChange(e.target.value)}
              maxLength={128}
              aria-invalid={!!errors.firstname}
              aria-describedby={firstnameA11y?.describedBy}
            />
            {errors.firstname ? (
              <FieldDescription id={firstnameA11y?.errorId} className="text-destructive">
                {errors.firstname}
              </FieldDescription>
            ) : null}
          </Field>
          <Field data-invalid={!!errors.lastname}>
            <FieldLabel htmlFor="lastname">Last Name</FieldLabel>
            <Input
              id="lastname"
              value={lastname}
              onChange={(e) => onLastnameChange(e.target.value)}
              maxLength={128}
              aria-invalid={!!errors.lastname}
              aria-describedby={lastnameA11y?.describedBy}
            />
            {errors.lastname ? (
              <FieldDescription id={lastnameA11y?.errorId} className="text-destructive">
                {errors.lastname}
              </FieldDescription>
            ) : null}
          </Field>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            maxLength={254}
            aria-invalid={!!errors.email}
            aria-describedby={emailA11y?.describedBy}
          />
          {errors.email ? (
            <FieldDescription id={emailA11y?.errorId} className="text-destructive">
              {errors.email}
            </FieldDescription>
          ) : null}
        </Field>
        <Field data-invalid={!!errors.tel}>
          <FieldLabel htmlFor="tel">Telephone</FieldLabel>
          <Input
            id="tel"
            value={tel}
            onChange={(e) => onTelChange(e.target.value)}
            placeholder="e.g. 0812345678 or +66812345678"
            maxLength={20}
            aria-invalid={!!errors.tel}
            aria-describedby={telA11y?.describedBy}
          />
          {errors.tel ? (
            <FieldDescription id={telA11y?.errorId} className="text-destructive">
              {errors.tel}
            </FieldDescription>
          ) : null}
        </Field>
        <LoadingButton onClick={onSave} loading={saving}>
          <Save data-icon="inline-start" />
          Save Changes
        </LoadingButton>
      </FieldGroup>
    </PageContentCard>
  );
}
