/** Gateway secret aligned with app.js `secretsMatch` target env vars. */
export function testGatewaySecret() {
  return (
    process.env.GATEWAY_SHARED_SECRET ||
    process.env.GATEWAY_SECRET ||
    "change-me"
  );
}

/** Standard mesh headers for agent-invoice integration tests. */
export function buildMeshHeaders(overrides = {}) {
  return {
    "x-gateway-secret": overrides.secret ?? testGatewaySecret(),
    "x-user-ou": overrides.ouId ?? "665a3d76b1e5f8b9e6f2b9b1",
    "x-user-branch": overrides.branchId ?? "665a3d76b1e5f8b9e6f2b9c1",
    "x-user-id": overrides.userId ?? "test_mesh_user",
    "x-user-role": overrides.role ?? "platform_admin",
    "x-user-permissions": overrides.permissions ?? "agents:*,invoices:*",
    accept: "application/json",
    "content-type": "application/json",
    ...overrides.extraHeaders,
  };
}
