import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Pencil, Save } from "lucide-react";

import { LoadingButton } from "@/components/LoadingButton";
import { DetailContainer } from "@/components/layout";
import { StatusBadge } from "@/components/StatusBadge";
import StaffProfileForm from "@/components/staff/StaffProfileForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePermission } from "@/hooks/usePermission";
import { apiErrorMessage } from "@/lib/apiError";
import { staffPasswordResetFieldErrors, validateAdminPasswordReset } from "@/lib/authErrors";
import * as staffApi from "@/lib/staffApiClient";
import {
  buildProfileContactPayload,
  emptyStaffProfileForm,
  STAFF_PROFILE_PAGE_DESCRIPTIONS,
  STAFF_PROFILE_PAGE_TITLES,
  type StaffProfileFormValues,
  type StaffProfilePageMode,
  validateStaffProfileForm,
} from "@/lib/staffProfileForm";
import { useNavigate, useParams } from "@/navigation/compat";
import type { PatchProfilePayload, StaffProfile } from "@/types/staff";

interface StaffProfilePageProps {
  mode: StaffProfilePageMode;
}

const StaffProfilePage: React.FC<StaffProfilePageProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { message } = useAppFeedback();
  const { confirm } = useConfirmDialog();
  const canAssignRole = usePermission("roles:assign");
  const canEdit = usePermission("profiles:edit");

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(mode !== "create");
  const [formValues, setFormValues] = useState<StaffProfileFormValues>(emptyStaffProfileForm);
  const [initialFormValues, setInitialFormValues] = useState<StaffProfileFormValues>(emptyStaffProfileForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof StaffProfileFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const currentEtag = useRef<string | null>(null);

  const profileId = mode === "create" ? null : (id ?? null);

  useEffect(() => {
    if (mode === "create") {
      setPageLoading(false);
      setProfile(null);
      setFormValues({ ...emptyStaffProfileForm, role: "staff" });
      setInitialFormValues({ ...emptyStaffProfileForm, role: "staff" });
      currentEtag.current = null;
      return;
    }

    if (!profileId) {
      message.error("Profile not found");
      navigate("/staff");
      return;
    }

    let cancelled = false;
    void (async () => {
      setPageLoading(true);
      try {
        const { profile: data, etag } = await staffApi.getProfileById(profileId);
        if (cancelled) return;
        setProfile(data);
        currentEtag.current = etag;
        const nextValues: StaffProfileFormValues = {
          code: data.code,
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email ?? "",
          tel: data.tel ?? "",
          role: data.user?.role,
        };
        setFormValues(nextValues);
        setInitialFormValues(nextValues);
      } catch (err: unknown) {
        if (cancelled) return;
        message.error(apiErrorMessage(err, "Failed to load profile"));
        navigate("/staff");
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, profileId, navigate, message]);

  const handleFieldChange = useCallback((field: keyof StaffProfileFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const isDirty = useMemo(() => {
    if (mode === "view") return false;
    if (mode === "create") {
      return JSON.stringify(formValues) !== JSON.stringify({ ...emptyStaffProfileForm, role: "staff" });
    }
    return JSON.stringify(formValues) !== JSON.stringify(initialFormValues);
  }, [formValues, initialFormValues, mode]);

  const handleBack = useCallback(() => {
    if (!isDirty) {
      navigate("/staff");
      return;
    }
    void confirm({
      title: "Discard unsaved changes?",
      content: "You have unsaved profile changes that will be lost.",
      okText: "Discard",
      danger: true,
      onOk: () => navigate("/staff"),
    });
  }, [confirm, isDirty, navigate]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const showAdminResetPassword =
    mode === "edit" && profile?.user_id != null && user?.sub != null && profile.user_id !== user.sub;

  const handleUpdatePassword = useCallback(async () => {
    if (!profileId) return;
    const validationErrors = validateAdminPasswordReset(formValues.newPassword, formValues.confirmNewPassword);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...validationErrors }));
      message.warning("Please fix the highlighted fields before updating password.");
      return;
    }

    const newPassword = formValues.newPassword!.trim();
    setFormErrors((prev) => ({ ...prev, newPassword: undefined, confirmNewPassword: undefined }));
    await confirm({
      title: "Reset password?",
      content: "This will sign the user out of all devices.",
      okText: "Update password",
      onOk: async () => {
        setUpdatingPassword(true);
        try {
          await staffApi.resetProfilePassword(profileId, { password: newPassword, revoke_sessions: true });
          message.success("Password updated");
          setFormValues((prev) => ({ ...prev, newPassword: "", confirmNewPassword: "" }));
        } catch (err) {
          const fieldErrors = staffPasswordResetFieldErrors(err);
          if (fieldErrors) {
            setFormErrors((prev) => ({ ...prev, ...fieldErrors }));
            message.error(fieldErrors.newPassword ?? "Failed to update password");
            return;
          }
          message.error(apiErrorMessage(err, "Failed to update password"));
        } finally {
          setUpdatingPassword(false);
        }
      },
    });
  }, [confirm, formValues.confirmNewPassword, formValues.newPassword, message, profileId]);

  const handleSave = useCallback(async () => {
    const isCreate = mode === "create";
    const errors = validateStaffProfileForm(formValues, isCreate);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      message.warning("Please fix the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);
    try {
      if (isCreate) {
        const { code, firstname, lastname, username, password } = formValues;
        await staffApi.createProfile({
          code: code!,
          firstname: firstname!,
          lastname: lastname!,
          username: username!,
          password: password!,
          ...buildProfileContactPayload(formValues, {}, "create"),
          ...(canAssignRole && formValues.role ? { role: formValues.role } : {}),
        });
        message.success("Profile created");
        navigate("/staff");
        return;
      }

      if (!profileId || !currentEtag.current) {
        message.error("Cannot save: version token missing. Please reload and try again.");
        return;
      }

      const { firstname, lastname } = formValues;
      const payload: PatchProfilePayload = {
        firstname: firstname!,
        lastname: lastname!,
        ...buildProfileContactPayload(
          formValues,
          { email: profile?.email ?? null, tel: profile?.tel ?? null },
          "patch",
        ),
      };
      await staffApi.patchProfile(profileId, payload, currentEtag.current);
      if (canAssignRole && formValues.role && formValues.role !== profile?.user?.role) {
        await staffApi.changeProfileRole(profileId, formValues.role);
      }
      message.success("Profile updated");
      navigate(`/staff/${profileId}`);
    } catch (err) {
      message.error(apiErrorMessage(err, isCreate ? "Failed to create profile" : "Failed to update profile"));
    } finally {
      setIsSaving(false);
    }
  }, [canAssignRole, formValues, message, mode, navigate, profile, profileId]);

  const pageTitle = useMemo(() => {
    if (mode === "create") return STAFF_PROFILE_PAGE_TITLES.create;
    if (profile) return `${profile.firstname} ${profile.lastname}`.trim() || profile.code;
    return STAFF_PROFILE_PAGE_TITLES[mode];
  }, [mode, profile]);

  const pageDescription = STAFF_PROFILE_PAGE_DESCRIPTIONS[mode];

  if (pageLoading && mode !== "create") {
    return (
      <DetailContainer title={STAFF_PROFILE_PAGE_TITLES[mode]} description="Loading profile…" onBack={handleBack}>
        <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Loading staff profile">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DetailContainer>
    );
  }

  return (
    <DetailContainer
      title={pageTitle}
      description={pageDescription}
      status={
        profile ? (
          <StatusBadge status={profile.status} variant={profile.status === "active" ? "success" : "secondary"} />
        ) : undefined
      }
      onBack={handleBack}
      extra={
        mode === "view" ? (
          canEdit && profileId ? (
            <Button onClick={() => navigate(`/staff/${profileId}/edit`)}>
              <Pencil data-icon="inline-start" />
              Edit profile
            </Button>
          ) : null
        ) : (
          <LoadingButton loading={isSaving} disabled={mode === "edit" && !isDirty} onClick={() => void handleSave()}>
            <Save data-icon="inline-start" />
            {mode === "create" ? "Create profile" : "Save changes"}
          </LoadingButton>
        )
      }
      maxWidth={720}
      className="gap-4"
    >
      <Card className="min-w-0 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Profile details</CardTitle>
          {profile?.user?.username ? (
            <CardDescription className="max-w-none text-pretty">
              {profile.user.username}
              {profile.user.role ? ` · ${profile.user.role}` : ""}
            </CardDescription>
          ) : (
            <CardDescription className="max-w-none text-pretty">
              Staff code, contact details, credentials, and role assignment.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="py-4">
          <StaffProfileForm
            mode={mode}
            loading={false}
            updatingPassword={updatingPassword}
            showAdminResetPassword={showAdminResetPassword}
            canAssignRole={canAssignRole}
            values={formValues}
            errors={formErrors}
            onChange={handleFieldChange}
            onUpdatePassword={() => void handleUpdatePassword()}
          />
        </CardContent>
      </Card>
    </DetailContainer>
  );
};

export default StaffProfilePage;
