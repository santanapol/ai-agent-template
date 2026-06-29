export interface DisplayInitialsInput {
  firstname?: string | null;
  lastname?: string | null;
  displayName?: string | null;
  username?: string | null;
}

/** Up to two uppercase letters for Avatar labels — no backend avatar field required. */
export function getDisplayInitials(input: DisplayInitialsInput): string | null {
  const first = (input.firstname ?? '').trim();
  const last = (input.lastname ?? '').trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }
  if (first) {
    return first.slice(0, 2).toUpperCase();
  }
  if (last) {
    return last.slice(0, 2).toUpperCase();
  }

  const displayName = (input.displayName ?? '').trim();
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }

  const username = (input.username ?? '').trim();
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }

  return null;
}
