import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

export function validateRequired(value: string | undefined, label: string): string | undefined {
  if (!value?.trim()) return `Please enter ${label.toLowerCase()}`;
  return undefined;
}

export function validateEmail(value: string | undefined): string | undefined {
  if (!value?.trim()) return "Please enter a valid email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Please enter a valid email";
  return undefined;
}

export function validateTelephone(value: string | undefined): string | undefined {
  if (!value?.trim()) return "Please enter telephone number";
  const clean = value.replace(/[- ]/g, "");
  if (!/^\+?\d{9,15}$/.test(clean)) {
    return "Invalid telephone format. e.g. 0812345678 or +66812345678";
  }
  return undefined;
}

export function validatePassword(value: string | undefined, required = true): string | undefined {
  if (!value?.trim()) {
    return required ? "Please enter a password" : undefined;
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Minimum ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Maximum ${PASSWORD_MAX_LENGTH} characters`;
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(value)) {
    return "Password must include uppercase, lowercase, numbers, and special characters";
  }
  return undefined;
}

export function validateConfirmPassword(
  confirm: string | undefined,
  password: string | undefined,
  required = true,
): string | undefined {
  if (!password?.trim()) return undefined;
  if (!confirm?.trim()) {
    return required ? "Please confirm the password" : undefined;
  }
  if (confirm !== password) return "Passwords do not match.";
  return undefined;
}

export function validateUsername(value: string | undefined): string | undefined {
  const required = validateRequired(value, "username");
  if (required || !value) return required;
  if (!/^[a-zA-Z0-9_]+$/.test(value.trim())) {
    return "Only English letters, numbers, and underscores allowed";
  }
  return undefined;
}
