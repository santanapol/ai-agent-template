import type { VariantProps } from 'class-variance-authority';
import { Badge, badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant | 'success' | 'warning';
}

const variantClass: Record<'success' | 'warning', string> = {
  success: 'border-transparent bg-success/15 text-success',
  warning: 'border-transparent bg-warning/15 text-warning',
};

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  if (variant === 'success' || variant === 'warning') {
    return <Badge className={variantClass[variant]}>{status}</Badge>;
  }
  return <Badge variant={variant}>{status}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'default' : 'secondary'} className="capitalize">
      {active ? 'active' : 'inactive'}
    </Badge>
  );
}
