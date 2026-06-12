const WILDCARD_SUFFIX = ":*";

/** @param {unknown} entry */
export function isWildcardEntry(entry) {
  if (typeof entry !== "string" || !entry.endsWith(WILDCARD_SUFFIX)) {
    return false;
  }
  const domain = entry.slice(0, -WILDCARD_SUFFIX.length);
  return domain.length > 0 && !domain.includes("*") && !domain.includes(":");
}

/**
 * @param {unknown} entry — exact action key หรือ wildcard `domain:*`
 * @param {unknown} actionKey — action key ที่ต้องการตรวจ (เช่น `profiles:create`)
 */
export function matchesPermission(entry, actionKey) {
  if (typeof entry !== "string" || typeof actionKey !== "string") {
    return false;
  }
  if (isWildcardEntry(entry)) {
    const prefix = entry.slice(0, -1); // 'profiles:*' → 'profiles:'
    return (
      actionKey.startsWith(prefix) &&
      actionKey.length > prefix.length &&
      !actionKey.includes("*")
    );
  }
  return entry === actionKey;
}

/**
 * @param {unknown} entries — รายการสิทธิ์จาก `menu_keys` / เคลม `permissions`
 * @param {unknown} actionKey
 */
export function anyPermissionMatches(entries, actionKey) {
  if (!Array.isArray(entries)) {
    return false;
  }
  return entries.some((entry) => matchesPermission(entry, actionKey));
}
