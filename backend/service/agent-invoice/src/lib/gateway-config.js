const PLACEHOLDER_SECRETS = new Set([
  'change-me-use-a-long-random-secret',
  'test-gateway-secret',
]);

/**
 * Validates GATEWAY_SECRET in production. No-op in dev/test.
 */
export function assertProductionGatewaySecret() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const secret = process.env.GATEWAY_SECRET;
  if (!secret || secret.length < 32 || PLACEHOLDER_SECRETS.has(secret)) {
    throw new Error(
      'GATEWAY_SECRET must be set to a strong secret (min 32 chars, not a placeholder) in production',
    );
  }
}
