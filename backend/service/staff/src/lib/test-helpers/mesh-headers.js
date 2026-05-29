/**
 * Standard mesh headers for integration tests (gateway → staff).
 * @param {object} [overrides]
 * @param {string} [overrides.secret]
 * @param {string} [overrides.userId]
 * @param {string} [overrides.ouId] 24-char hex
 * @param {string} [overrides.branchId] 24-char hex
 * @param {string} [overrides.role]
 */
export function buildMeshHeaders(overrides = {}) {
  const ouId = overrides.ouId ?? "507f1f77bcf86cd799439011";
  const branchId = overrides.branchId ?? "507f1f77bcf86cd799439012";

  return {
    "x-gateway-secret":
      overrides.secret ?? "test-gateway-secret-32-chars-minimum!!",
    "x-user-id": overrides.userId ?? "507f1f77bcf86cd799439013",
    "x-user-ou": ouId,
    "x-user-branch": branchId,
    "x-user-role": overrides.role ?? "platform_admin",
    accept: "application/json",
    "content-type": "application/json",
    ...overrides.extraHeaders,
  };
}
