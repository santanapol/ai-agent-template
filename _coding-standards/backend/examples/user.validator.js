'use strict';

/**
 * Per-feature validator template per api.md → Validation → File location.
 *
 * Path: src/modules/<feature>/<feature>.validator.js
 * Export shape: { <action>: { <source>: <Joi schema> } }
 *
 * Schemas ต้อง compile ครั้งเดียวที่ require time (top-level const).
 */

const Joi = require('joi');
const { objectId, isoDatetime } = require('../../utils/schemas');

const idParams = Joi.object({
  userId: objectId.required(),
}).unknown(false);

const create = {
  body: Joi.object({
    email: Joi.string().email().required(),
    displayName: Joi.string().min(1).max(100).required(),
    role: Joi.string().valid('admin', 'user', 'viewer').default('user'),
    birthDate: Joi.date().iso().less('now').optional(),
  }).unknown(false),
};

const update = {
  params: idParams,
  body: Joi.object({
    displayName: Joi.string().min(1).max(100),
    phone: Joi.string().pattern(/^\+?[0-9\- ]{6,20}$/).allow(null),
    role: Joi.string().valid('admin', 'user', 'viewer'),
  })
    .min(1)
    .unknown(false),
};

const list = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'displayName', '-displayName').default('-createdAt'),
    role: Joi.string().valid('admin', 'user', 'viewer'),
    createdAtFrom: isoDatetime.optional(),
    createdAtTo: isoDatetime.optional(),
  }).unknown(false),
};

const detail = { params: idParams };
const remove = { params: idParams };

module.exports = { create, update, list, detail, delete: remove };
