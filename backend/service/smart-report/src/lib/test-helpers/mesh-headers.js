/**
 * Standard mesh headers for integration tests (gateway → smart-report).
 * @param {object} [overrides]
 * @param {string} [overrides.secret]
 * @param {string} [overrides.userId]
 * @param {string} [overrides.ouId]
 * @param {string} [overrides.branchId]
 * @param {string} [overrides.role]
 * @param {Record<string,string>} [overrides.extraHeaders]
 */
export function buildMeshHeaders(overrides = {}) {
  return {
    "x-gateway-secret":
      overrides.secret ??
      process.env.GATEWAY_SHARED_SECRET ??
      "test-gateway-secret-32-chars-minimum!!",
    "x-user-id": overrides.userId ?? "507f1f77bcf86cd799439013",
    "x-user-ou": overrides.ouId ?? "507f1f77bcf86cd799439011",
    "x-user-branch": overrides.branchId ?? "507f1f77bcf86cd799439012",
    "x-user-role": overrides.role ?? "platform_admin",
    accept: "application/json",
    "content-type": "application/json",
    ...overrides.extraHeaders,
  };
}
