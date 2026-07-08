const CRITICAL_HEADERS = [
  "x-gateway-secret",
  "x-user-ou",
  "x-user-branch",
  "x-user-home-branch",
  "x-user-id",
  "x-user-role",
];

/**
 * @param {string | string[] | undefined} value
 * @returns {boolean}
 */
function isDuplicatedHeaderValue(value) {
  if (Array.isArray(value)) {
    return true;
  }
  if (typeof value === "string" && value.includes(",")) {
    return true;
  }
  return false;
}

/**
 * @param {import('fastify').FastifyRequest} request
 * @returns {string | null} header name if duplicated, else null
 */
export function findDuplicateCriticalHeader(request) {
  for (const name of CRITICAL_HEADERS) {
    if (isDuplicatedHeaderValue(request.headers[name])) {
      return name;
    }
  }
  return null;
}

export { CRITICAL_HEADERS };
