"use strict";

const Joi = require("joi");

const itemId = Joi.string().length(24).hex();

const createBody = Joi.object({
  code: Joi.string()
    .pattern(/^[A-Z0-9_-]{3,30}$/)
    .required(),
  name: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().trim().max(500).allow(null).default(null),
  status: Joi.string().valid("draft", "active", "inactive").required(),
  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(30))
    .max(10)
    .unique()
    .default([]),
}).unknown(false);

const replaceBody = createBody.keys({
  description: Joi.string().trim().max(500).allow(null).required(),
  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(30))
    .max(10)
    .unique()
    .required(),
});

const patchBody = Joi.object({
  name: Joi.string().trim().min(1).max(120),
  description: Joi.string().trim().max(500).allow(null),
  status: Joi.string().valid("draft", "active", "inactive"),
  tags: Joi.array().items(Joi.string().trim().min(1).max(30)).max(10).unique(),
})
  .min(1)
  .unknown(false);

module.exports = {
  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }).unknown(false),
  },
  create: {
    body: createBody,
  },
  detail: {
    params: Joi.object({
      itemId: itemId.required(),
    }).unknown(false),
  },
  replace: {
    params: Joi.object({
      itemId: itemId.required(),
    }).unknown(false),
    body: replaceBody,
  },
  update: {
    params: Joi.object({
      itemId: itemId.required(),
    }).unknown(false),
    body: patchBody,
  },
  remove: {
    params: Joi.object({
      itemId: itemId.required(),
    }).unknown(false),
  },
};
