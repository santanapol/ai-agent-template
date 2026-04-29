"use strict";

const HttpError = require("../utils/http-error");
const CODES = require("../utils/error-codes");

function formatJoiErrors(error) {
  return error.details.map((detail) => {
    const field = detail.path.join(".");
    return {
      field,
      message: detail.message,
      type: detail.type,
    };
  });
}

function validate(schema) {
  return (req, _res, next) => {
    req.validated = {};
    const parts = ["params", "query", "body"];

    for (const part of parts) {
      if (!schema[part]) {
        continue;
      }

      const { value, error } = schema[part].validate(req[part], {
        abortEarly: false,
        stripUnknown: false,
      });

      if (error) {
        return next(
          new HttpError(400, CODES.INVALID_PARAM, "Request validation failed", {
            errors: formatJoiErrors(error),
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
