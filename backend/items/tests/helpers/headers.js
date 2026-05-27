export function validHeaders(overrides = {}) {
  return {
    'x-gateway-secret':
      process.env.GATEWAY_SECRET ??
      'a2fecb45705b2cdc7a4ae447e39137b43d51e0451602024f0538cc14df30535b',
    'x-user-ou': '665a1b2c3d4e5f6789012345',
    'x-user-branch': '665a1b2c3d4e5f6789012346',
    'x-user-id': 'user-001',
    'x-user-role': 'admin',
    'content-type': 'application/json',
    ...overrides,
  };
}
