import { ObjectId } from "mongodb";

/**
 * @param {string | ObjectId} value
 * @returns {ObjectId}
 */
export function toObjectId(value) {
  if (value instanceof ObjectId) {
    return value;
  }
  if (typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value)) {
    return new ObjectId(value);
  }
  throw new Error(`Invalid ObjectId: ${value}`);
}
