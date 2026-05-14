"use strict";

const { randomUUID } = require("node:crypto");

function requestIdMiddleware(req, res, next) {
  const headerValue = req.headers["x-request-id"];
  const requestId =
    typeof headerValue === "string" && headerValue.trim()
      ? headerValue
      : randomUUID();

  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  req.log = req.log ? req.log.child({ requestId }) : req.log;

  next();
}

module.exports = requestIdMiddleware;
