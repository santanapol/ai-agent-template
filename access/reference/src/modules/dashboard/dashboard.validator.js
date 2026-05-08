"use strict";

const Joi = require("joi");

module.exports = {
  summary: {
    params: Joi.object({
      ouId: Joi.string().trim().min(1).max(128).required(),
      branchId: Joi.string().trim().min(1).max(128).required(),
    }).unknown(false),
  },
};
