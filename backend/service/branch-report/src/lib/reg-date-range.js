import { createParamError } from "./param-error.js";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Maximum inclusive calendar days allowed between regDateFrom and regDateTo. */
export const MAX_REG_DATE_RANGE_DAYS = 366;

/**
 * @param {string} value
 * @param {string} field
 * @returns {Date}
 */
function parseUtcDateOnly(value, field) {
  if (!value || typeof value !== "string" || !DATE_ONLY_RE.test(value)) {
    throw createParamError(400, "INVALID_PARAM", `Invalid ${field}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createParamError(400, "INVALID_PARAM", `Invalid ${field}`);
  }

  return date;
}

/**
 * Parse required registration date range query params into MongoDB bounds (UTC inclusive days).
 *
 * @param {string | undefined} regDateFrom
 * @param {string | undefined} regDateTo
 * @returns {{ reg_date: { $gte: Date; $lte: Date } }}
 */
export function parseRegDateRange(regDateFrom, regDateTo) {
  if (!regDateFrom || !regDateTo) {
    throw createParamError(
      400,
      "INVALID_PARAM",
      "regDateFrom and regDateTo are required",
    );
  }

  const from = parseUtcDateOnly(regDateFrom, "regDateFrom");
  const toStart = parseUtcDateOnly(regDateTo, "regDateTo");
  assertValidRegRange(from, toStart);

  return {
    reg_date: {
      $gte: from,
      $lte: new Date(`${regDateTo}T23:59:59.999Z`),
    },
  };
}

/**
 * @param {Date} from
 * @param {Date} toStart
 */
function assertValidRegRange(from, toStart) {
  if (from > toStart) {
    throw createParamError(
      400,
      "INVALID_PARAM",
      "regDateFrom must be on or before regDateTo",
    );
  }

  const inclusiveDays =
    Math.floor((toStart.getTime() - from.getTime()) / MS_PER_DAY) + 1;
  if (inclusiveDays > MAX_REG_DATE_RANGE_DAYS) {
    throw createParamError(
      400,
      "INVALID_PARAM",
      `reg date range must not exceed ${MAX_REG_DATE_RANGE_DAYS} days`,
    );
  }
}

/**
 * First/last calendar day of the current UTC month (for backend tests).
 * @param {Date} [reference=new Date()]
 * @returns {{ regDateFrom: string; regDateTo: string }}
 */
export function currentMonthDateStringsUtc(reference = new Date()) {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));

  return {
    regDateFrom: first.toISOString().slice(0, 10),
    regDateTo: last.toISOString().slice(0, 10),
  };
}
