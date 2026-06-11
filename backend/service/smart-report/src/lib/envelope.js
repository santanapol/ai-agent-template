import CODES from "./error-codes.js";

export function successEnvelope(
  data,
  message = null,
  code = CODES.SUCCESS,
  pagination,
) {
  const envelope = {
    success: true,
    code,
    message,
    data,
  };

  if (pagination !== undefined) {
    envelope.pagination = pagination;
  }

  return envelope;
}

export function errorEnvelope({ code, message, data = null, requestId }) {
  return {
    success: false,
    code,
    message,
    data,
    requestId,
  };
}
