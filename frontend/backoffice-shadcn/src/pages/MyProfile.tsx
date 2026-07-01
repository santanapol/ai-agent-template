import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, RefreshCw, Save } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageContentCard } from '@/components/layout';
import { DescriptionList } from '@/components/description-list';
import { LoadingButton } from '@/components/loading-button';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { fieldErrorIds } from '@/lib/fieldA11y';
import { apiErrorMessage } from '@/lib/apiError';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRequired,
  validateTelephone,
} from '@/lib/formValidation';
import { notifyProfileRefresh } from '@/lib/profileRefresh';
import * as authApi from '@/lib/authApiClient';
import * as staffApi from '@/lib/staffApiClient';
import { formatTelephoneToE164 } from '@/lib/telephone';
import { PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';
import type { PatchProfilePayload, StaffProfile } from '@/types/staff';

const MyProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const currentEtag = useRef<string | null>(null);

  const [code, setCode] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const userSub = user?.sub;
  const firstnameA11y = profileErrors.firstname ? fieldErrorIds('firstname') : undefined;
  const lastnameA11y = profileErrors.lastname ? fieldErrorIds('lastname') : undefined;
  const emailA11y = profileErrors.email ? fieldErrorIds('email') : undefined;
  const telA11y = profileErrors.tel ? fieldErrorIds('tel') : undefined;
  const currentPasswordA11y = passwordErrors.current_password ? fieldErrorIds('current_password') : undefined;
  const newPasswordErrorA11y = fieldErrorIds('new_password');
  const newPasswordHintId = 'new_password-hint';
  const confirmNewPasswordA11y = passwordErrors.confirm_new_password
    ? fieldErrorIds('confirm_new_password')
    : undefined;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userSub) {
        setLoadError('User session is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);
      try {
        const { profile: data, etag } = await staffApi.getProfileByUserId(userSub);
        if (cancelled) return;
        setProfile(data);
        currentEtag.current = etag;
        setCode(data.code);
        setFirstname(data.firstname);
        setLastname(data.lastname);
        setEmail(data.email);
        setTel(data.tel);
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        const msg = apiErrorMessage(err, 'Failed to load your profile');
        setLoadError(msg);
        message.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [message, userSub, reloadKey]);

  const handleSave = async () => {
    if (!profile || !currentEtag.current) return;

    const errors: Record<string, string> = {};
    const fnErr = validateRequired(firstname, 'first name');
    const lnErr = validateRequired(lastname, 'last name');
    const emailErr = validateEmail(email);
    const telErr = validateTelephone(tel);
    if (fnErr) errors.firstname = fnErr;
    if (lnErr) errors.lastname = lnErr;
    if (emailErr) errors.email = emailErr;
    if (telErr) errors.tel = telErr;
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});

    const payload: PatchProfilePayload = {
      firstname,
      lastname,
      email,
      tel: formatTelephoneToE164(tel),
    };

    setSaving(true);
    try {
      const { profile: updated, etag } = await staffApi.patchProfile(
        profile.id,
        payload,
        currentEtag.current,
      );
      setProfile(updated);
      currentEtag.current = etag;
      setCode(updated.code);
      setFirstname(updated.firstname);
      setLastname(updated.lastname);
      setEmail(updated.email);
      setTel(updated.tel);
      message.success('Profile updated');
      notifyProfileRefresh();
    } catch (err) {
      message.error(apiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current_password = 'Please enter your current password';
    const npErr = validatePassword(newPassword);
    const cpErr = validateConfirmPassword(confirmNewPassword, newPassword);
    if (npErr) errors.new_password = npErr;
    if (cpErr) errors.confirm_new_password = cpErr;
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});

    setChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      message.success('Password updated. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code as string | undefined;
        if (code === 'LOGIN_INVALID_CREDENTIALS') {
          message.error('Current password is incorrect.');
          return;
        }
        if (code === 'AUTH_PASSWORD_UNCHANGED') {
          message.error('New password must differ from the current password.');
          return;
        }
        if (code === 'AUTH_PASSWORD_POLICY_VIOLATION') {
          message.error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
          return;
        }
      }
      message.error(apiErrorMessage(err, 'Failed to change password'));
    } finally {
      setChangingPassword(false);
    }
  };

  const displayName = profile
    ? [profile.firstname, profile.lastname].filter(Boolean).join(' ') || profile.user.username
    : '';

  return (
    <PageContainer
      title="My Profile"
      description="View and update your staff contact details. Staff code cannot be changed."
      extra={
        <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-64 max-w-[720px] rounded-xl" aria-busy="true" />
      ) : loadError && !profile ? (
        <PageContentCard className="max-w-[720px]">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </PageContentCard>
      ) : profile ? (
        <>
          <PageContentCard className="max-w-[720px]">
            <div className="mb-6 flex items-center gap-4">
              <UserAvatar
                size={64}
                firstname={profile.firstname}
                lastname={profile.lastname}
                username={profile.user.username}
              />
              <div>
                <p className="text-lg font-semibold">{displayName}</p>
                <p className="text-sm text-muted-foreground">{profile.user.username}</p>
              </div>
            </div>

            <DescriptionList
              items={[
                { label: 'Login username', value: profile.user.username },
                { label: 'System role', value: profile.user.role },
                { label: 'Status', value: profile.status },
              ]}
              className="mb-6"
            />

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="code">Staff Code</FieldLabel>
                <Input id="code" value={code} disabled placeholder="e.g. EMP-001" maxLength={32} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={!!profileErrors.firstname}>
                  <FieldLabel htmlFor="firstname">First Name</FieldLabel>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={(e) => {
                      setFirstname(e.target.value);
                      if (profileErrors.firstname) {
                        setProfileErrors((p) => {
                          const next = { ...p };
                          delete next.firstname;
                          return next;
                        });
                      }
                    }}
                    maxLength={128}
                    aria-invalid={!!profileErrors.firstname}
                  aria-describedby={firstnameA11y?.describedBy}
                  />
                  {profileErrors.firstname ? (
                  <FieldDescription id={firstnameA11y?.errorId} className="text-destructive">
                    {profileErrors.firstname}
                  </FieldDescription>
                  ) : null}
                </Field>
                <Field data-invalid={!!profileErrors.lastname}>
                  <FieldLabel htmlFor="lastname">Last Name</FieldLabel>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={(e) => {
                      setLastname(e.target.value);
                      if (profileErrors.lastname) {
                        setProfileErrors((p) => {
                          const next = { ...p };
                          delete next.lastname;
                          return next;
                        });
                      }
                    }}
                    maxLength={128}
                    aria-invalid={!!profileErrors.lastname}
                  aria-describedby={lastnameA11y?.describedBy}
                  />
                  {profileErrors.lastname ? (
                  <FieldDescription id={lastnameA11y?.errorId} className="text-destructive">
                    {profileErrors.lastname}
                  </FieldDescription>
                  ) : null}
                </Field>
              </div>
              <Field data-invalid={!!profileErrors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (profileErrors.email) {
                      setProfileErrors((p) => {
                        const next = { ...p };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  maxLength={254}
                  aria-invalid={!!profileErrors.email}
                  aria-describedby={emailA11y?.describedBy}
                />
                {profileErrors.email ? (
                  <FieldDescription id={emailA11y?.errorId} className="text-destructive">
                    {profileErrors.email}
                  </FieldDescription>
                ) : null}
              </Field>
              <Field data-invalid={!!profileErrors.tel}>
                <FieldLabel htmlFor="tel">Telephone</FieldLabel>
                <Input
                  id="tel"
                  value={tel}
                  onChange={(e) => {
                    setTel(e.target.value);
                    if (profileErrors.tel) {
                      setProfileErrors((p) => {
                        const next = { ...p };
                        delete next.tel;
                        return next;
                      });
                    }
                  }}
                  placeholder="e.g. 0812345678 or +66812345678"
                  maxLength={20}
                  aria-invalid={!!profileErrors.tel}
                  aria-describedby={telA11y?.describedBy}
                />
                {profileErrors.tel ? (
                  <FieldDescription id={telA11y?.errorId} className="text-destructive">
                    {profileErrors.tel}
                  </FieldDescription>
                ) : null}
              </Field>
              <LoadingButton onClick={() => void handleSave()} loading={saving}>
                <Save data-icon="inline-start" />
                Save Changes
              </LoadingButton>
            </FieldGroup>
          </PageContentCard>

          <PageContentCard title="Change password" className="mt-6 max-w-[720px]">
            <FieldGroup>
              <Field data-invalid={!!passwordErrors.current_password}>
                <FieldLabel htmlFor="current_password">Current password</FieldLabel>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  aria-invalid={!!passwordErrors.current_password}
                  aria-describedby={currentPasswordA11y?.describedBy}
                />
                {passwordErrors.current_password ? (
                  <FieldDescription id={currentPasswordA11y?.errorId} className="text-destructive">
                    {passwordErrors.current_password}
                  </FieldDescription>
                ) : null}
              </Field>
              <Field data-invalid={!!passwordErrors.new_password}>
                <FieldLabel htmlFor="new_password">New password</FieldLabel>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={!!passwordErrors.new_password}
                  aria-describedby={passwordErrors.new_password ? newPasswordErrorA11y.describedBy : newPasswordHintId}
                />
                {passwordErrors.new_password ? (
                  <FieldDescription id={newPasswordErrorA11y.errorId} className="text-destructive">
                    {passwordErrors.new_password}
                  </FieldDescription>
                ) : (
                  <FieldDescription id={newPasswordHintId}>
                    Minimum {PASSWORD_MIN_LENGTH} characters with mixed case, numbers, and symbols.
                  </FieldDescription>
                )}
              </Field>
              <Field data-invalid={!!passwordErrors.confirm_new_password}>
                <FieldLabel htmlFor="confirm_new_password">Confirm new password</FieldLabel>
                <Input
                  id="confirm_new_password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  aria-invalid={!!passwordErrors.confirm_new_password}
                  aria-describedby={confirmNewPasswordA11y?.describedBy}
                />
                {passwordErrors.confirm_new_password ? (
                  <FieldDescription id={confirmNewPasswordA11y?.errorId} className="text-destructive">
                    {passwordErrors.confirm_new_password}
                  </FieldDescription>
                ) : null}
              </Field>
              <LoadingButton onClick={() => void handleChangePassword()} loading={changingPassword}>
                <KeyRound data-icon="inline-start" />
                Change password
              </LoadingButton>
            </FieldGroup>
          </PageContentCard>
        </>
      ) : null}
    </PageContainer>
  );
};

export default MyProfile;
