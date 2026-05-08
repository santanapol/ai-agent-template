"use strict";

const express = require("express");
const controller = require("./billing.controller");
const validators = require("./billing.validator");
const { validate } = require("../../middlewares/validate.middleware");

const router = express.Router({ mergeParams: true });

router.get("/plan", validate(validators.getPlan), controller.getPlan);
router.patch("/plan", validate(validators.updatePlan), controller.updatePlan);
router.get("/invoices", validate(validators.listInvoices), controller.listInvoices);

module.exports = router;
