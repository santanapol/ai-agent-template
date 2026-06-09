import { randomUUID } from "node:crypto";

/**
 * @param {string | string[] | undefined} headerValue
 * @returns {string}
 */
export function resolveRequestId(headerValue) {
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }
  return randomUUID();
}
