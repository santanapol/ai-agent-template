import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

/**
 * @param {string | undefined} provided
 * @param {string | undefined} expected
 * @returns {boolean}
 */
export function secretsMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
