import {
  CheckCircle2,
  ShieldX,
  FileQuestion,
  ServerCrash,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ResultStatus = 'success' | '403' | '404' | '500';

const STATUS_CONFIG: Record<
  ResultStatus,
  { icon: LucideIcon; iconClassName: string }
> = {
  success: { icon: CheckCircle2, iconClassName: 'text-success' },
  '403': { icon: ShieldX, iconClassName: 'text-warning' },
  '404': { icon: FileQuestion, iconClassName: 'text-muted-foreground' },
  '500': { icon: ServerCrash, iconClassName: 'text-destructive' },
};

interface ResultTemplateProps {
  status?: ResultStatus;
  title?: string;
  subTitle?: string;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  extra?: React.ReactNode;
}

const ResultTemplate: React.FC<ResultTemplateProps> = ({
  status = '404',
  title = 'Page Not Found',
  subTitle = 'Sorry, the page you visited does not exist.',
  primaryActionText = 'Back Home',
  onPrimaryAction,
  extra,
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const resultExtra = extra ?? (
    <Button onClick={onPrimaryAction}>{primaryActionText}</Button>
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-xl shadow-sm">
        <CardHeader className="items-center text-center">
          <Icon className={cn(config.iconClassName)} aria-hidden="true" />
          <CardTitle className="text-xl text-balance">{title}</CardTitle>
          <CardDescription className="text-pretty">{subTitle}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">{resultExtra}</CardFooter>
      </Card>
    </div>
  );
};

export default ResultTemplate;
