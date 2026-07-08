import type React from "react";
import { useEffect, useRef, useState } from "react";

import { RefreshCw } from "lucide-react";

import { ListPageCard } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import * as authApi from "@/lib/authApiClient";
import { passwordChangeFieldErrors } from "@/lib/authErrors";
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRequired,
  validateTelephone,
} from "@/lib/formValidation";
import { notifyProfileRefresh } from "@/lib/profileRefresh";
import * as staffApi from "@/lib/staffApiClient";
import { formatTelephoneToE164 } from "@/lib/telephone";
import { useNavigate } from "@/navigation/compat";
import type { PatchProfilePayload, StaffProfile } from "@/types/staff";

import { ChangePasswordCard } from "./profile/ChangePasswordCard";
import { ProfileDetailsCard } from "./profile/ProfileDetailsCard";

const profileDescription = "View and update your staff contact details. Staff code cannot be changed.";

const MyProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [_reloadKey, setReloadKey] = useState(0);
  const currentEtag = useRef<string | null>(null);

  const [code, setCode] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const userSub = user?.sub;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userSub) {
        setLoadError("User session is missing.");
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
        const msg = apiErrorMessage(err, "Failed to load your profile");
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
  }, [message, userSub]);

  const clearProfileError = (field: string) => {
    if (!profileErrors[field]) return;
    setProfileErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSave = async () => {
    if (!profile || !currentEtag.current) return;

    const errors: Record<string, string> = {};
    const fnErr = validateRequired(firstname, "first name");
    const lnErr = validateRequired(lastname, "last name");
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
      const { profile: updated, etag } = await staffApi.patchProfile(profile.id, payload, currentEtag.current);
      setProfile(updated);
      currentEtag.current = etag;
      setCode(updated.code);
      setFirstname(updated.firstname);
      setLastname(updated.lastname);
      setEmail(updated.email);
      setTel(updated.tel);
      message.success("Profile updated");
      notifyProfileRefresh();
    } catch (err) {
      message.error(apiErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.current_password = "Please enter your current password";
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
      message.success("Password updated. Please sign in again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      const fieldErrors = passwordChangeFieldErrors(err);
      if (fieldErrors) {
        setPasswordErrors(fieldErrors);
        return;
      }
      message.error(apiErrorMessage(err, "Failed to change password"));
    } finally {
      setChangingPassword(false);
    }
  };

  const refreshButton = (
    <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
      <RefreshCw data-icon="inline-start" />
      Refresh
    </Button>
  );

  if (loading) {
    return (
      <ListPageCard title="My Profile" description={profileDescription}>
        <Skeleton className="mx-4 h-64 max-w-[720px] rounded-xl" aria-busy="true" />
      </ListPageCard>
    );
  }

  if (loadError && !profile) {
    return (
      <ListPageCard title="My Profile" description={profileDescription} toolbar={refreshButton}>
        <div className="flex max-w-[720px] flex-col gap-3 px-4">
          <p className="text-destructive text-sm">{loadError}</p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      </ListPageCard>
    );
  }

  if (!profile) return null;

  return (
    <ListPageCard title="My Profile" description={profileDescription} toolbar={refreshButton}>
      <div className="flex flex-col gap-6 px-4">
        <ProfileDetailsCard
          profile={profile}
          code={code}
          firstname={firstname}
          lastname={lastname}
          email={email}
          tel={tel}
          errors={profileErrors}
          saving={saving}
          onFirstnameChange={(value) => {
            setFirstname(value);
            clearProfileError("firstname");
          }}
          onLastnameChange={(value) => {
            setLastname(value);
            clearProfileError("lastname");
          }}
          onEmailChange={(value) => {
            setEmail(value);
            clearProfileError("email");
          }}
          onTelChange={(value) => {
            setTel(value);
            clearProfileError("tel");
          }}
          onSave={() => void handleSave()}
        />
        <ChangePasswordCard
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmNewPassword={confirmNewPassword}
          errors={passwordErrors}
          changingPassword={changingPassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmNewPasswordChange={setConfirmNewPassword}
          onChangePassword={() => void handleChangePassword()}
        />
      </div>
    </ListPageCard>
  );
};

export default MyProfile;
