import { rejectRequest } from '../utils/response.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return rejectRequest(res, req, {
        status: 400,
        code: 'INVALID_PARAM',
        message: error.details.map((detail) => detail.message).join('; '),
      });
    }

    req.body = value;
    next();
  };
}
