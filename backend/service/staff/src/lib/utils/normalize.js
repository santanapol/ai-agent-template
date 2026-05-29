import { HttpError } from "../http-error.js";
import CODES from "../error-codes.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {string} value
 * @param {string} field
 * @param {{ min?: number, max?: number }} [limits]
 */
export function normalizeTrimmedField(value, field, limits = {}) {
  const min = limits.min ?? 1;
  const max = limits.max ?? 128;

  if (typeof value !== "string") {
    throw new HttpError(400, CODES.INVALID_PARAM, `${field} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      `${field} must be at least ${min} character(s) after trim`,
    );
  }
  if (trimmed.length > max) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      `${field} must be at most ${max} characters`,
    );
  }

  return trimmed;
}

/**
 * @param {string} email
 */
export function normalizeEmail(email) {
  const trimmed = normalizeTrimmedField(email, "email", { max: 254 });
  const lower = trimmed.toLowerCase();

  if (!EMAIL_PATTERN.test(lower)) {
    throw new HttpError(400, CODES.INVALID_PARAM, "email format is invalid");
  }

  return lower;
}

/**
 * @param {string} tel
 */
export function normalizeTel(tel) {
  const trimmed = normalizeTrimmedField(tel, "tel", { min: 2, max: 16 });

  if (!trimmed.startsWith("+")) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "tel must be in E.164 format (start with +)",
    );
  }

  const digits = trimmed.slice(1);
  if (!/^\d{1,15}$/.test(digits)) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "tel must contain only digits after the leading +",
    );
  }

  const normalized = `+${digits}`;
  if (normalized.length > 16) {
    throw new HttpError(
      400,
      CODES.INVALID_PARAM,
      "tel must be at most 16 characters",
    );
  }

  return normalized;
}

/**
 * @param {string} username
 */
export function normalizeUsername(username) {
  const trimmed = normalizeTrimmedField(username, "username", { max: 128 });
  return trimmed.toLowerCase();
}

/**
 * Normalize merge-patch body (only fields present).
 * @param {Record<string, unknown>} body
 */
export function normalizePatchFields(body) {
  /** @type {Record<string, string>} */
  const fields = {};

  if (body.code !== undefined) {
    fields.code = normalizeTrimmedField(body.code, "code", { max: 32 });
  }
  if (body.firstname !== undefined) {
    fields.firstname = normalizeTrimmedField(body.firstname, "firstname", {
      max: 128,
    });
  }
  if (body.lastname !== undefined) {
    fields.lastname = normalizeTrimmedField(body.lastname, "lastname", {
      max: 128,
    });
  }
  if (body.email !== undefined) {
    fields.email = normalizeEmail(body.email);
  }
  if (body.tel !== undefined) {
    fields.tel = normalizeTel(body.tel);
  }

  return fields;
}

/**
 * @param {object} body
 */
export function normalizeProfileFields(body) {
  return {
    code: normalizeTrimmedField(body.code, "code", { max: 32 }),
    firstname: normalizeTrimmedField(body.firstname, "firstname", {
      max: 128,
    }),
    lastname: normalizeTrimmedField(body.lastname, "lastname", { max: 128 }),
    email: normalizeEmail(body.email),
    tel: normalizeTel(body.tel),
  };
}
