"use strict";

const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");
const { formatValidationErrors } = require("../utils/validation-error");

function validate(schema) {
  return (req, _res, next) => {
    req.validated = {};
    const parts = ["params", "query", "body", "headers"];

    for (const part of parts) {
      if (!schema[part]) {
        continue;
      }

      const { value, error } = schema[part].validate(req[part], {
        abortEarly: false,
        convert: true,
        stripUnknown: false,
        errors: {
          wrap: { label: "" },
          label: "path",
        },
      });

      if (error) {
        return next(
          new HttpError(400, CODES.INVALID_PARAM, "Request validation failed", {
            errors: formatValidationErrors(part, error.details),
          }),
        );
      }

      req.validated[part] = value;
    }

    return next();
  };
}

module.exports = {
  validate,
};
