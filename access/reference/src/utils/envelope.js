"use strict";

const CODES = require("./error-codes");

function successEnvelope(
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

  if (pagination) {
    envelope.pagination = pagination;
  }

  return envelope;
}

function errorEnvelope({ code, message, data = null, requestId }) {
  return {
    success: false,
    code,
    message,
    data,
    requestId,
  };
}

module.exports = {
  successEnvelope,
  errorEnvelope,
};
