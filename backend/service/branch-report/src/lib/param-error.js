import { ObjectId } from "mongodb";

export const CHANNEL_TYPES = ["affiliate_link", "member_referral", "direct"];

/**
 * @param {number} statusCode
 * @param {string} code
 * @param {string} message
 */
export function createParamError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * @param {string} value
 * @param {string} field
 * @returns {import('mongodb').ObjectId}
 */
export function parseObjectId(value, field) {
  try {
    return new ObjectId(value);
  } catch {
    throw createParamError(400, "INVALID_PARAM", `Invalid ${field}`);
  }
}
