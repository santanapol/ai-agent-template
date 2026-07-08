/** Headers that must not appear more than once on a mesh request. */
export const CRITICAL_HEADERS = [
  "x-gateway-secret",
  "x-user-ou",
  "x-user-branch",
  "x-user-home-branch",
  "x-user-id",
  "x-user-role",
  "x-user-permissions",
];

/**
 * Count header names from Node's rawHeaders list (key, value, key, value, …).
 * @param {string[]} rawHeaders
 * @returns {Map<string, number>}
 */
export function countHeaderOccurrences(rawHeaders) {
  const countMap = new Map();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const key = String(rawHeaders[index] || "").toLowerCase();
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }
  return countMap;
}

/**
 * @param {import('fastify').FastifyRequest} request
 * @returns {string | null} duplicate header name, or null if none
 */
export function findDuplicateCriticalHeader(request) {
  const counts = countHeaderOccurrences(request.raw?.rawHeaders || []);
  for (const header of CRITICAL_HEADERS) {
    const raw = request.headers[header];
    if ((counts.get(header) || 0) > 1 || Array.isArray(raw)) {
      return header;
    }
  }
  return null;
}
