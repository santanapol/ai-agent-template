"use strict";

function readErrorCode(error) {
  if (!error || typeof error !== "object" || !Object.hasOwn(error, "code")) {
    return "";
  }

  return String(error.code || "");
}

module.exports = {
  readErrorCode,
};
