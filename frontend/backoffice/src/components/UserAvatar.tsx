import { Avatar } from 'antd';
import type { AvatarProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getDisplayInitials } from '../lib/displayInitials';

export interface UserAvatarProps extends Omit<AvatarProps, 'children' | 'icon'> {
  firstname?: string | null;
  lastname?: string | null;
  displayName?: string | null;
  username?: string | null;
}

export function UserAvatar({
  firstname,
  lastname,
  displayName,
  username,
  ...avatarProps
}: UserAvatarProps) {
  const initials = getDisplayInitials({ firstname, lastname, displayName, username });

  if (initials) {
    return <Avatar {...avatarProps}>{initials}</Avatar>;
  }

  return <Avatar {...avatarProps} icon={<UserOutlined />} />;
}
