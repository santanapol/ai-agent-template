"use strict";

const Joi = require("joi");

const roleSchema = Joi.string().valid("manager", "member", "billing");
const statusSchema = Joi.string().valid("active", "suspended");

module.exports = {
  list: {
    params: Joi.object({
      ouId: Joi.string().trim().min(1).max(128).required(),
      branchId: Joi.string().trim().min(1).max(128).required(),
    }).unknown(false),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }).unknown(false),
  },
  create: {
    params: Joi.object({
      ouId: Joi.string().trim().min(1).max(128).required(),
      branchId: Joi.string().trim().min(1).max(128).required(),
    }).unknown(false),
    body: Joi.object({
      username: Joi.string().trim().min(3).max(128).required(),
      password: Joi.string().min(8).max(200).required(),
      displayName: Joi.string().trim().min(1).max(200).required(),
      email: Joi.string().email().allow(null),
      role: roleSchema.required(),
      status: statusSchema.default("active"),
    }).unknown(false),
  },
  update: {
    params: Joi.object({
      ouId: Joi.string().trim().min(1).max(128).required(),
      branchId: Joi.string().trim().min(1).max(128).required(),
      userId: Joi.string().trim().min(1).max(128).required(),
    }).unknown(false),
    body: Joi.object({
      displayName: Joi.string().trim().min(1).max(200),
      email: Joi.string().email().allow(null),
      role: roleSchema,
      status: statusSchema,
      password: Joi.string().min(8).max(200),
    })
      .min(1)
      .unknown(false),
  },
  remove: {
    params: Joi.object({
      ouId: Joi.string().trim().min(1).max(128).required(),
      branchId: Joi.string().trim().min(1).max(128).required(),
      userId: Joi.string().trim().min(1).max(128).required(),
    }).unknown(false),
  },
};
