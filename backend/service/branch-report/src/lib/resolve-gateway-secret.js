/**
 * Resolves gateway shared secret for mesh auth.
 * Tests may pass `options.gatewaySecret`; production requires `GATEWAY_SECRET` env.
 *
 * @param {{ gatewaySecret?: string }} [options]
 * @returns {string}
 */
export function resolveGatewaySecret(options = {}) {
  if (options.gatewaySecret) {
    return options.gatewaySecret;
  }

  const fromEnv = process.env.GATEWAY_SECRET?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-gateway-secret';
  }

  throw new Error('GATEWAY_SECRET is required');
}
