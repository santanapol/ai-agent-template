const WILDCARD_SUFFIX = ":*";

export function isWildcardEntry(entry: unknown): boolean {
  if (typeof entry !== "string" || !entry.endsWith(WILDCARD_SUFFIX)) return false;
  const domain = entry.slice(0, -WILDCARD_SUFFIX.length);
  return domain.length > 0 && !domain.includes("*") && !domain.includes(":");
}

export function matchesPermission(entry: unknown, actionKey: unknown): boolean {
  if (typeof entry !== "string" || typeof actionKey !== "string") return false;
  if (isWildcardEntry(entry)) {
    const prefix = entry.slice(0, -1); // 'profiles:*' → 'profiles:'
    return actionKey.startsWith(prefix) && actionKey.length > prefix.length && !actionKey.includes("*");
  }
  return entry === actionKey;
}

export function anyPermissionMatches(entries: unknown, actionKey: unknown): boolean {
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) => matchesPermission(entry, actionKey));
}
