import { Buffer } from "node:buffer";

/**
 * Build a weak ETag from a Date or ISO date string.
 * @param {Date | string} updDate
 * @returns {string}
 */
export function buildEtag(updDate) {
  const dateStr =
    updDate instanceof Date ? updDate.toISOString() : String(updDate);
  const encoded = Buffer.from(dateStr, "utf8").toString("base64");
  return `W/"${encoded}"`;
}

/**
 * Decode a weak ETag back to its ISO date string.
 * @param {string | undefined} etag
 * @returns {string | null}
 */
export function decodeEtag(etag) {
  if (!etag) return null;
  const match = etag.match(/^W\/"([^"]+)"$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return null;
  }
}
