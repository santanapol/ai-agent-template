import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatIconTone = 'primary' | 'success' | 'warning' | 'muted';

const iconToneClass: Record<StatIconTone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
};

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon?: LucideIcon;
  iconTone?: StatIconTone;
  className?: string;
}

export function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  iconTone = 'primary',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className={iconToneClass[iconTone]} /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">
          {value}
          {suffix ? (
            <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
