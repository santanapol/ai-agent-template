"use strict";

const { successEnvelope } = require("../../utils/envelope");
const service = require("./dashboard.service");

function getInput(req, key) {
  return req.validated && req.validated[key] ? req.validated[key] : req[key];
}

function getRole(req) {
  const role = req.headers["x-user-role"];
  return typeof role === "string" ? role : "";
}

async function summary(req, res, next) {
  try {
    const params = getInput(req, "params");
    const result = await service.getSummary({
      params,
      userContext: req.userContext,
      role: getRole(req),
    });
    return res.status(200).json(successEnvelope(result));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  summary,
};
