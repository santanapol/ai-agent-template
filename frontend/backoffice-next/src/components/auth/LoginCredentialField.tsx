import type React from "react";

import { Eye, EyeOff } from "lucide-react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { fieldErrorIds } from "@/lib/fieldA11y";

interface LoginCredentialFieldProps {
  id: string;
  label: string;
  type?: "text" | "password";
  placeholder: string;
  autoComplete: string;
  icon: React.ReactNode;
  value: string;
  error?: string;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  spellCheck?: boolean;
  onShowPasswordToggle?: () => void;
  onChange: (value: string) => void;
  onClearError?: () => void;
}

export function LoginCredentialField({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  icon,
  value,
  error,
  showPasswordToggle = false,
  showPassword = false,
  spellCheck,
  onShowPasswordToggle,
  onChange,
  onClearError,
}: LoginCredentialFieldProps) {
  const a11y = error ? fieldErrorIds(id) : undefined;
  let inputType = type;
  if (showPasswordToggle) {
    inputType = showPassword ? "text" : "password";
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon align="inline-start">{icon}</InputGroupAddon>
        <InputGroupInput
          id={id}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (error) onClearError?.();
          }}
          aria-invalid={!!error}
          aria-describedby={a11y?.describedBy}
          spellCheck={spellCheck}
        />
        {showPasswordToggle ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-xs"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={onShowPasswordToggle}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {error ? <FieldError id={a11y?.errorId}>{error}</FieldError> : null}
    </Field>
  );
}
