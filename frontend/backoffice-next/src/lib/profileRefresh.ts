type ProfileRefreshListener = () => void;

const listeners = new Set<ProfileRefreshListener>();

/** Subscribe to staff profile updates (e.g. after My Profile save). */
export function subscribeProfileRefresh(listener: ProfileRefreshListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notify layout/header to reload profile display name and avatar initials. */
export function notifyProfileRefresh(): void {
  listeners.forEach((listener) => {
    listener();
  });
}
