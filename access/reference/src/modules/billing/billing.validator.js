"use strict";

const Joi = require("joi");

function paramsSchema() {
  return Joi.object({
    ouId: Joi.string().trim().min(1).max(128).required(),
    branchId: Joi.string().trim().min(1).max(128).required(),
  }).unknown(false);
}

module.exports = {
  getPlan: {
    params: paramsSchema(),
  },
  listInvoices: {
    params: paramsSchema(),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }).unknown(false),
  },
  updatePlan: {
    params: paramsSchema(),
    body: Joi.object({
      planCode: Joi.string().trim().min(1).max(64).required(),
    }).unknown(false),
  },
};
