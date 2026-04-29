'use strict';

/**
 * Route wiring template per api.md → Routing.
 *
 * Path: src/modules/users/users.route.js
 * - validator middleware ก่อน controller (ดู validate.middleware.js)
 * - resource path = plural kebab-case; param = :camelCase
 * - PATCH ใช้ JSON Merge Patch (RFC 7396)
 */

const express = require('express');
const validators = require('./users.validator');
const controller = require('./users.controller');
const { validate } = require('../../middlewares/validate.middleware');

const router = express.Router();

router.get('/', validate(validators.list), controller.list);
router.post('/', validate(validators.create), controller.create);

router.get('/:userId', validate(validators.detail), controller.detail);
router.patch('/:userId', validate(validators.update), controller.update);
router.delete('/:userId', validate(validators.delete), controller.remove);

module.exports = router;
