import type { VariantProps } from 'class-variance-authority';
import { Badge, badgeVariants } from '@/components/ui/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface StatusBadgeProps {
  status: string;
  variant: BadgeVariant;
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  return <Badge variant={variant}>{status}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'default' : 'secondary'} className="capitalize">
      {active ? 'active' : 'inactive'}
    </Badge>
  );
}
