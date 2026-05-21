"use strict";

const SUB_CODE_BY_JOI_TYPE = new Map([
  ["any.required", "REQUIRED"],
  ["string.empty", "REQUIRED"],
  ["array.includesRequiredUnknowns", "REQUIRED"],
  ["string.base", "INVALID_TYPE"],
  ["number.base", "INVALID_TYPE"],
  ["boolean.base", "INVALID_TYPE"],
  ["array.base", "INVALID_TYPE"],
  ["object.base", "INVALID_TYPE"],
  ["number.min", "OUT_OF_RANGE"],
  ["number.max", "OUT_OF_RANGE"],
  ["array.min", "OUT_OF_RANGE"],
  ["array.max", "OUT_OF_RANGE"],
  ["string.min", "OUT_OF_RANGE"],
  ["string.max", "OUT_OF_RANGE"],
  ["date.min", "OUT_OF_RANGE"],
  ["date.max", "OUT_OF_RANGE"],
  ["string.email", "INVALID_FORMAT"],
  ["string.pattern.base", "INVALID_FORMAT"],
  ["string.uri", "INVALID_FORMAT"],
  ["string.isoDate", "INVALID_FORMAT"],
  ["any.only", "INVALID_FORMAT"],
  ["object.unknown", "UNKNOWN_FIELD"],
]);

function mapValidationCode(type) {
  return SUB_CODE_BY_JOI_TYPE.get(type) || "INVALID_FORMAT";
}

function formatValidationErrors(source, details) {
  return details.map((detail) => {
    const pathTail = detail.path.join(".");
    const path = pathTail ? `${source}.${pathTail}` : source;

    return {
      path,
      code: mapValidationCode(detail.type),
      message: detail.message,
    };
  });
}

module.exports = {
  formatValidationErrors,
};
