import React from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { Input } from "@/components/ui/input";
import { fieldErrorIds } from "@/lib/fieldA11y";

type InputChildProps = React.ComponentProps<typeof Input>;

interface StaffFormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactElement<InputChildProps>;
}

export function StaffFormField({ id, label, error, children }: StaffFormFieldProps) {
  const a11y = error ? fieldErrorIds(id) : undefined;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {React.cloneElement(children, {
        id,
        "aria-invalid": a11y?.ariaInvalid,
        "aria-describedby": a11y?.describedBy,
      })}
      {error ? (
        <FieldDescription id={a11y?.errorId} className="text-destructive">
          {error}
        </FieldDescription>
      ) : null}
    </Field>
  );
}
