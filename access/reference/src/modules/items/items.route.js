"use strict";

const express = require("express");
const validators = require("./items.validator");
const controller = require("./items.controller");
const { validate } = require("../../middlewares/validate.middleware");

const router = express.Router();

router.get("/", validate(validators.list), controller.list);
router.post("/", validate(validators.create), controller.create);

router.get("/:itemId", validate(validators.detail), controller.detail);
router.put("/:itemId", validate(validators.replace), controller.replace);
router.patch("/:itemId", validate(validators.update), controller.update);
router.delete("/:itemId", validate(validators.remove), controller.remove);

module.exports = router;
