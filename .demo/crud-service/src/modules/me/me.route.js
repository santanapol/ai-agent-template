"use strict";

const express = require("express");
const { getMe } = require("./me.controller");

const router = express.Router();
router.get("/", getMe);

module.exports = router;
