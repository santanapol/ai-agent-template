import { User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getDisplayInitials } from '@/lib/displayInitials';

export interface UserAvatarProps {
  firstname?: string | null;
  lastname?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({
  firstname,
  lastname,
  displayName,
  username,
  size = 40,
  className,
}: UserAvatarProps) {
  const initials = getDisplayInitials({ firstname, lastname, displayName, username });

  return (
    <Avatar className={cn('cursor-pointer bg-primary text-primary-foreground', className)} style={{ width: size, height: size }}>
      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
        {initials ?? <User className="size-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
