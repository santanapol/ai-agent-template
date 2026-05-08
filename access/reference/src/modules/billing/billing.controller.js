"use strict";

const { successEnvelope } = require("../../utils/envelope");
const CODES = require("../../utils/error-codes");
const service = require("./billing.service");

function getInput(req, key) {
  return req.validated && req.validated[key] ? req.validated[key] : req[key];
}

function getRole(req) {
  const role = req.headers["x-user-role"];
  return typeof role === "string" ? role : "";
}

async function getPlan(req, res, next) {
  try {
    const params = getInput(req, "params");
    const data = await service.getPlan({
      params,
      userContext: req.userContext,
      role: getRole(req),
    });
    return res.status(200).json(successEnvelope(data));
  } catch (error) {
    return next(error);
  }
}

async function listInvoices(req, res, next) {
  try {
    const params = getInput(req, "params");
    const query = getInput(req, "query");
    const result = await service.listInvoices({
      params,
      query,
      userContext: req.userContext,
      role: getRole(req),
    });
    return res
      .status(200)
      .json(
        successEnvelope(result.invoices, null, CODES.SUCCESS, result.pagination),
      );
  } catch (error) {
    return next(error);
  }
}

async function updatePlan(req, res, next) {
  try {
    const params = getInput(req, "params");
    const body = getInput(req, "body");
    const result = await service.updatePlan({
      params,
      body,
      userContext: req.userContext,
      role: getRole(req),
    });
    return res.status(200).json(successEnvelope(result));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPlan,
  listInvoices,
  updatePlan,
};
