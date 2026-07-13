import { validateEmail, validateTelephone } from "@/lib/formValidation";
import { validatePassword } from "@/lib/passwordPolicy";
import { formatTelephoneToE164 } from "@/lib/telephone";
import type { CreateProfilePayload, PatchProfilePayload } from "@/types/staff";

export type StaffProfilePageMode = "create" | "edit" | "view";

export type StaffProfileFormValues = CreateProfilePayload &
  PatchProfilePayload & {
    password?: string;
    confirmPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
    role?: string;
  };

export type ProfileContactSnapshot = {
  email?: string | null;
  tel?: string | null;
};

export const emptyStaffProfileForm: StaffProfileFormValues = {
  code: "",
  firstname: "",
  lastname: "",
  email: "",
  tel: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "staff",
};

export const STAFF_PROFILE_PAGE_TITLES: Record<StaffProfilePageMode, string> = {
  create: "Create Staff Profile",
  edit: "Edit Staff Profile",
  view: "View Staff Profile",
};

export const STAFF_PROFILE_PAGE_DESCRIPTIONS: Record<StaffProfilePageMode, string> = {
  create: "Add a new staff member with credentials and role assignment.",
  edit: "Update profile details, role, and optional password reset.",
  view: "Review staff profile details in read-only mode.",
};

function normalizeContactFormValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeContactInitialValue(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeContactApiValue(
  value: string | null | undefined,
  mode: "create" | "patch",
): string | null | undefined {
  const trimmed = normalizeContactFormValue(value);
  if (!trimmed) {
    return mode === "patch" ? null : undefined;
  }
  return trimmed;
}

export function buildProfileContactPayload(
  form: Pick<StaffProfileFormValues, "email" | "tel">,
  initial: ProfileContactSnapshot,
  mode: "create" | "patch",
): Partial<{ email: string | null; tel: string | null }> {
  const payload: Partial<{ email: string | null; tel: string | null }> = {};
  const formEmail = normalizeContactFormValue(form.email);
  const formTel = normalizeContactFormValue(form.tel);
  const initialEmail = normalizeContactInitialValue(initial.email);
  const initialTel = normalizeContactInitialValue(initial.tel);

  if (mode === "create") {
    if (formEmail) payload.email = formEmail;
    if (formTel) payload.tel = formatTelephoneToE164(formTel);
    return payload;
  }

  const nextEmail = normalizeContactApiValue(form.email, "patch");
  if (nextEmail !== undefined && nextEmail !== initialEmail) {
    payload.email = nextEmail;
  }

  const nextTelRaw = normalizeContactApiValue(form.tel, "patch");
  if (nextTelRaw !== undefined) {
    const nextTel = nextTelRaw === null ? null : formatTelephoneToE164(nextTelRaw);
    const currentTel = initialTel === null || initialTel === "" ? null : formatTelephoneToE164(initialTel);
    if (nextTel !== currentTel) {
      payload.tel = nextTel;
    }
  }

  return payload;
}

export function validateStaffProfileField(
  field: keyof StaffProfileFormValues,
  values: StaffProfileFormValues,
  isCreate = false,
): string | undefined {
  const raw = values[field];
  const v = typeof raw === "string" ? raw : undefined;
  if (field === "code" && !v?.trim()) return "Please enter staff code";
  if (field === "firstname" && !v?.trim()) return "Please enter first name";
  if (field === "lastname" && !v?.trim()) return "Please enter last name";
  if (field === "email") return validateEmail(v);
  if (field === "tel") return validateTelephone(v);
  if (field === "username" && isCreate) {
    if (!v?.trim()) return "Please enter username";
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return "Only English letters, numbers, and underscores allowed";
  }
  if (field === "password" && isCreate) {
    return validatePassword(v);
  }
  if (field === "confirmPassword" && values.password) {
    if (v !== values.password) return "Passwords do not match";
  }
  return undefined;
}

export function validateStaffProfileForm(
  values: StaffProfileFormValues,
  isCreate: boolean,
): Partial<Record<keyof StaffProfileFormValues, string>> {
  const fields: (keyof StaffProfileFormValues)[] = isCreate
    ? ["code", "firstname", "lastname", "email", "tel", "username", "password", "confirmPassword"]
    : ["firstname", "lastname", "email", "tel"];
  const errors: Partial<Record<keyof StaffProfileFormValues, string>> = {};
  fields.forEach((f) => {
    const err = validateStaffProfileField(f, values, isCreate);
    if (err) errors[f] = err;
  });
  return errors;
}
