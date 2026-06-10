import CODES from "./error-codes.js";

export function successEnvelope(data, message = null, code = CODES.SUCCESS) {
  return {
    success: true,
    code,
    message,
    data,
  };
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
