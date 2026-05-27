import { sendError } from '../utils/response.js';

export function errorMiddleware(err, req, res, next) {
  void next;

  const status = err.status ?? 500;
  const message = status >= 500 ? 'An internal error occurred' : err.message;

  sendError(res, {
    status,
    code: err.code ?? 'INTERNAL_ERROR',
    message,
    requestId: req.requestId,
  });
}
