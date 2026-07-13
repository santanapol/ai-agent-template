import type { VariantProps } from "class-variance-authority";

import { Badge, type badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant | "success" | "warning";
  /** Raw status for screen readers when `status` is a human label. */
  ariaLabel?: string;
}

export function StatusBadge({ status, variant = "default", ariaLabel }: StatusBadgeProps) {
  return (
    <Badge variant={variant} aria-label={ariaLabel}>
      {status}
    </Badge>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"} className="capitalize">
      {active ? "active" : "inactive"}
    </Badge>
  );
}
