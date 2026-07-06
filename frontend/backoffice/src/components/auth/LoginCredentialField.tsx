import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { fieldErrorIds } from '@/lib/fieldA11y';

interface LoginCredentialFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'password';
  placeholder: string;
  autoComplete: string;
  icon: React.ReactNode;
  value: string;
  error?: string;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onShowPasswordToggle?: () => void;
  onChange: (value: string) => void;
  onClearError?: () => void;
}

export function LoginCredentialField({
  id,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  icon,
  value,
  error,
  showPasswordToggle = false,
  showPassword = false,
  onShowPasswordToggle,
  onChange,
  onClearError,
}: LoginCredentialFieldProps) {
  const a11y = error ? fieldErrorIds(id) : undefined;
  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          type={inputType}
          className={showPasswordToggle ? 'pr-12 pl-9' : 'pl-9'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (error) onClearError?.();
          }}
          aria-invalid={!!error}
          aria-describedby={a11y?.describedBy}
        />
        {showPasswordToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute inset-y-1 right-1"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={onShowPasswordToggle}
          >
            {showPassword ? (
              <EyeOff data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Eye data-icon="inline-start" aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </div>
      {error ? (
        <FieldDescription id={a11y?.errorId} className="text-destructive" role="alert">
          {error}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
