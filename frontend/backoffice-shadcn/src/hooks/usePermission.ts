import { useAuth } from '../contexts/AuthContext';
import { anyPermissionMatches } from '../lib/permissionMatch';

export function usePermission(actionKey: string): boolean {
  const { permissions } = useAuth();
  return anyPermissionMatches(permissions || [], actionKey);
}
