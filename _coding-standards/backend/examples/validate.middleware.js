'use strict';

/**
 * Validation middleware per api.md → Validation.
 * ใช้ Joi global config: abortEarly=false, convert=true, stripUnknown=false.
 * Mapping Joi error → codes.yaml sub-codes อยู่ใน utils/validation-error.js
 */

const { mapJoiError } = require('../utils/validation-error');

const JOI_OPTS = Object.freeze({
  abortEarly: false,
  convert: true,
  stripUnknown: false,
  errors: {
    wrap: { label: '' },
    label: 'path',
  },
});

function validate(schema) {
  const sources = ['body', 'query', 'params', 'headers'].filter(
    (s) => schema[s] !== undefined,
  );

  return function validateMiddleware(req, _res, next) {
    const errors = [];

    for (const source of sources) {
      const { value, error } = schema[source].validate(req[source], JOI_OPTS);
      if (error) {
        errors.push(...error.details.map((d) => mapJoiError(d, source)));
        continue;
      }
      req[source] = value;
    }

    if (errors.length === 0) return next();

    const validationError = new Error('Request validation failed');
    validationError.name = 'ValidationError';
    validationError.statusCode = 400;
    validationError.code = 'INVALID_PARAM';
    validationError.errors = errors;
    return next(validationError);
  };
}

module.exports = { validate };
