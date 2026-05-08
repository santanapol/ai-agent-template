"use strict";

const express = require("express");
const { validate } = require("../../middlewares/validate.middleware");
const controller = require("./dashboard.controller");
const validators = require("./dashboard.validator");

const router = express.Router({ mergeParams: true });

router.get("/summary", validate(validators.summary), controller.summary);

module.exports = router;
