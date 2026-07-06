import { AtSign, CircleCheck, Hash, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AccountRow {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

interface ProfileAccountPanelProps {
  username: string;
  roleLabel: string;
  staffCode: string;
  className?: string;
}

export function ProfileAccountPanel({
  username,
  roleLabel,
  staffCode,
  className,
}: ProfileAccountPanelProps) {
  const rows: AccountRow[] = [
    {
      icon: AtSign,
      label: 'Username',
      value: username,
    },
    {
      icon: Shield,
      label: 'System role',
      value: roleLabel,
    },
    {
      icon: Hash,
      label: 'Staff code',
      value: staffCode,
      valueClassName: 'font-mono tabular-nums',
    },
    {
      icon: CircleCheck,
      label: 'Account status',
      value: <Badge variant="secondary">Active</Badge>,
    },
  ];

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="border-b">
        <CardTitle className="text-base">System account</CardTitle>
        <CardDescription>
          Read-only identifiers assigned by your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {rows.map((row, index) => {
            const Icon = row.icon;
            return (
              <li key={row.label}>
                <div className="flex items-center gap-3 px-6 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={cn('text-sm font-medium text-pretty', row.valueClassName)}>
                      {row.value}
                    </span>
                  </div>
                </div>
                {index < rows.length - 1 ? <Separator /> : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
