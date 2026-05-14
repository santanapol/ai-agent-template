import { useMemo } from "react";
import { sessionToApiHeaders, type SessionHeaders } from "../lib/api";
import type { Session } from "./auth-context";

/** Stable `SessionHeaders` for data hooks (`useCallback` deps must not change every render). */
export function useSessionApiHeaders(session: Session): SessionHeaders {
  return useMemo(() => sessionToApiHeaders(session), [session]);
}
