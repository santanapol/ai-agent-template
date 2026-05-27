export function sendSuccess(res, { status = 200, code, message, data, pagination }) {
  const body = {
    success: true,
    code,
    message,
    data,
  };

  if (pagination) {
    body.pagination = pagination;
  }

  return res.status(status).json(body);
}

export function sendError(res, { status, code, message, requestId }) {
  return res.status(status).json({
    success: false,
    code,
    message,
    data: null,
    requestId,
  });
}

export function rejectRequest(res, req, { status, code, message }) {
  return sendError(res, { status, code, message, requestId: req.requestId });
}
