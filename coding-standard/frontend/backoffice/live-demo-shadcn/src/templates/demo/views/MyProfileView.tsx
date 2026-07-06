import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, KeyRound, Lock, Mail, Phone, User, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileAccountPanel } from '@/components/demo/profile-account-panel';
import { LoadingButton } from '@/components/demo/loading-button';
import { DetailContainer, PageContentCard } from '../../index';
import { currentUser, ROLE_LABELS } from '../mockData';
import { simulateSave } from '../helpers';
import type { DemoViewProps } from '../types';

type ProfileValues = {
  firstname: string;
  lastname: string;
  email: string;
  tel: string;
};

const INITIAL_PROFILE: ProfileValues = {
  firstname: currentUser.firstname,
  lastname: currentUser.lastname,
  email: currentUser.email,
  tel: currentUser.tel,
};

const getPasswordStrength = (password: string) => {
  if (!password) return { percent: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return { percent: 25, label: 'Weak — add uppercase, numbers, or symbols' };
  if (score === 3) return { percent: 50, label: 'Fair — almost there' };
  if (score === 4) return { percent: 75, label: 'Good password' };
  return { percent: 100, label: 'Strong password' };
};

interface IconFieldProps {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
  className?: string;
}

function IconField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
  type = 'text',
  placeholder,
  error,
  hint,
  autoComplete,
  className,
}: IconFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Icon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
      </InputGroup>
      {error ? (
        <FieldDescription id={`${id}-error`} className="text-destructive">
          {error}
        </FieldDescription>
      ) : hint ? (
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

const MyProfileView: React.FC<DemoViewProps> = ({ setDemoMode }) => {
  const [profile, setProfile] = useState<ProfileValues>(INITIAL_PROFILE);
  const [profileBaseline, setProfileBaseline] = useState(INITIAL_PROFILE);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileValues, string>>>({});
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileDirty = useMemo(
    () => (Object.keys(profileBaseline) as Array<keyof ProfileValues>).some(
      (key) => profile[key] !== profileBaseline[key],
    ),
    [profile, profileBaseline],
  );

  const displayName = `${profile.firstname} ${profile.lastname}`.trim();
  const initials = `${profile.firstname[0] ?? ''}${profile.lastname[0] ?? ''}`.toUpperCase();
  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => () => {
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
  }, [avatarUrl]);

  const handleBack = () => setDemoMode('dashboard');

  const discardProfileChanges = () => {
    setProfile(profileBaseline);
    setProfileErrors({});
  };

  const handleTabChange = (key: string) => {
    if (activeTab === 'profile' && profileDirty) {
      setPendingTab(key);
      return;
    }
    setActiveTab(key);
  };

  const handleProfileSave = async () => {
    const errors: Partial<Record<keyof ProfileValues, string>> = {};
    if (!profile.firstname.trim()) errors.firstname = 'Please enter first name';
    if (!profile.lastname.trim()) errors.lastname = 'Please enter last name';
    if (!profile.email.includes('@')) errors.email = 'Please enter a valid email';
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setProfileSaving(true);
    try {
      await simulateSave();
      setProfileBaseline(profile);
      toast.success('Profile saved successfully');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    const errors: { current?: string; new?: string; confirm?: string } = {};
    if (!currentPassword) errors.current = 'Please enter current password';
    if (!newPassword) {
      errors.new = 'Please enter a new password';
    } else if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errors.new = 'Password must be at least 8 characters with uppercase and number';
    }
    if (!confirmPassword) {
      errors.confirm = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirm = 'Passwords do not match';
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});
    setPasswordSaving(true);
    try {
      await simulateSave();
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarChange = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a PNG, JPG, or WebP image');
      return;
    }
    if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    setAvatarUrl(URL.createObjectURL(file));
    toast.info('Photo preview updated — save profile to persist');
  }, [avatarUrl]);

  const updateProfile = (key: keyof ProfileValues, value: string) => {
    setProfile((p) => ({ ...p, [key]: value }));
    if (profileErrors[key]) {
      setProfileErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const profileFooter = profileDirty ? (
    <div className="flex w-full justify-end gap-2">
      <Button variant="outline" onClick={discardProfileChanges} disabled={profileSaving}>
        Discard
      </Button>
      <LoadingButton onClick={handleProfileSave} loading={profileSaving}>
        Save changes
      </LoadingButton>
    </div>
  ) : undefined;

  return (
    <DetailContainer
      title="My Profile"
      description="Manage your personal information and account security."
      onBack={handleBack}
      maxWidth={960}
    >
      <PageContentCard>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-20 shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={`${displayName} avatar`} /> : null}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-balance">{displayName}</p>
              <Badge variant="secondary">{ROLE_LABELS[currentUser.role]}</Badge>
              <Badge>Active</Badge>
            </div>
            <p className="text-sm text-pretty text-muted-foreground">{profile.email}</p>
            <p className="text-sm text-muted-foreground">
              Staff code <span className="font-medium tabular-nums text-foreground">{currentUser.code}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 self-start sm:self-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera data-icon="inline-start" />
            Change photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => handleAvatarChange(e.target.files?.[0])}
          />
        </div>
      </PageContentCard>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-fit">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <PageContentCard
              title="Personal information"
              description="Update your name and contact details."
              footer={profileFooter}
            >
              <FieldGroup>
                <div className="flex flex-col gap-5 @md/field-group:flex-row @md/field-group:[&>*]:min-w-0 @md/field-group:[&>*]:flex-1">
                  <IconField
                    id="firstname"
                    label="First Name"
                    icon={User}
                    value={profile.firstname}
                    onChange={(v) => updateProfile('firstname', v)}
                    disabled={profileSaving}
                    error={profileErrors.firstname}
                  />
                  <IconField
                    id="lastname"
                    label="Last Name"
                    icon={User}
                    value={profile.lastname}
                    onChange={(v) => updateProfile('lastname', v)}
                    disabled={profileSaving}
                    error={profileErrors.lastname}
                  />
                </div>
                <IconField
                  id="email"
                  label="Email"
                  icon={Mail}
                  type="email"
                  value={profile.email}
                  onChange={(v) => updateProfile('email', v)}
                  disabled={profileSaving}
                  error={profileErrors.email}
                  hint="Changing your email may require verification in production."
                />
                <IconField
                  id="tel"
                  label="Telephone"
                  icon={Phone}
                  placeholder="e.g. 0812345678"
                  value={profile.tel}
                  onChange={(v) => updateProfile('tel', v)}
                  disabled={profileSaving}
                />
              </FieldGroup>
            </PageContentCard>

            <ProfileAccountPanel
              username={currentUser.username}
              roleLabel={ROLE_LABELS[currentUser.role]}
              staffCode={currentUser.code}
            />
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <PageContentCard
            title="Change password"
            description="Use a strong password you do not use elsewhere."
            className="max-w-lg"
            footer={
              <div className="flex w-full justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordErrors({});
                  }}
                  disabled={passwordSaving}
                >
                  Reset
                </Button>
                <LoadingButton onClick={handlePasswordSave} loading={passwordSaving}>
                  Update Password
                </LoadingButton>
              </div>
            }
          >
            <div className="flex flex-col gap-6">
              <Alert>
                <Lock aria-hidden="true" />
                <AlertTitle>Password requirements</AlertTitle>
                <AlertDescription>
                  At least 8 characters with one uppercase letter and one number. Symbols are recommended.
                </AlertDescription>
              </Alert>
              <FieldGroup>
                <IconField
                  id="current-password"
                  label="Current Password"
                  icon={Lock}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(v) => {
                    setCurrentPassword(v);
                    if (passwordErrors.current) {
                      setPasswordErrors((p) => ({ ...p, current: undefined }));
                    }
                  }}
                  disabled={passwordSaving}
                  error={passwordErrors.current}
                />
                <IconField
                  id="new-password"
                  label="New Password"
                  icon={KeyRound}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(v) => {
                    setNewPassword(v);
                    if (passwordErrors.new) {
                      setPasswordErrors((p) => ({ ...p, new: undefined }));
                    }
                  }}
                  disabled={passwordSaving}
                  error={passwordErrors.new}
                />
                {newPassword ? (
                  <div className="flex flex-col gap-2">
                    <Progress value={passwordStrength.percent} aria-label="Password strength" />
                    <p className="text-xs text-pretty text-muted-foreground">{passwordStrength.label}</p>
                  </div>
                ) : null}
                <IconField
                  id="confirm-password"
                  label="Confirm New Password"
                  icon={KeyRound}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(v) => {
                    setConfirmPassword(v);
                    if (passwordErrors.confirm) {
                      setPasswordErrors((p) => ({ ...p, confirm: undefined }));
                    }
                  }}
                  disabled={passwordSaving}
                  error={passwordErrors.confirm}
                />
              </FieldGroup>
            </div>
          </PageContentCard>
        </TabsContent>
      </Tabs>

      <AlertDialog open={pendingTab !== null} onOpenChange={(open) => !open && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile changes have not been saved yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                discardProfileChanges();
                if (pendingTab) setActiveTab(pendingTab);
                setPendingTab(null);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailContainer>
  );
};

export default MyProfileView;
