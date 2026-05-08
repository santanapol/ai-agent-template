"use strict";

const express = require("express");
const validators = require("./members.validator");
const controller = require("./members.controller");
const { validate } = require("../../middlewares/validate.middleware");

const router = express.Router({ mergeParams: true });

router.get("/", validate(validators.list), controller.list);
router.post("/", validate(validators.create), controller.create);
router.patch("/:userId", validate(validators.update), controller.update);
router.delete("/:userId", validate(validators.remove), controller.remove);

module.exports = router;
