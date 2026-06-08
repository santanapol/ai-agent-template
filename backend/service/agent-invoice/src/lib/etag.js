import { Buffer } from 'node:buffer';

/**
 * @param {Date} updDate
 * @returns {string}
 */
export function buildEtag(updDate) {
  if (!(updDate instanceof Date) || Number.isNaN(updDate.getTime())) {
    throw new TypeError('updDate must be a valid Date');
  }
  const encoded = Buffer.from(updDate.toISOString(), 'utf8').toString('base64');
  return `W/"${encoded}"`;
}

/**
 * @param {string | undefined} ifMatch
 * @param {Date | undefined} updDate
 * @returns {boolean}
 */
export function validateIfMatch(ifMatch, updDate) {
  if (typeof ifMatch !== 'string' || !ifMatch.trim()) {
    return false;
  }
  if (!(updDate instanceof Date) || Number.isNaN(updDate.getTime())) {
    return false;
  }
  try {
    return buildEtag(updDate) === ifMatch.trim();
  } catch {
    return false;
  }
}
