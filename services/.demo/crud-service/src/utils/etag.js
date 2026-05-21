"use strict";

function encodeEtagFromDate(date) {
  return `W/"${Buffer.from(date.toISOString()).toString("base64url")}"`;
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Prefer upd_date, then cr_date, then BSON ObjectId creation time (legacy / hand-seeded docs).
 */
function resolveVersionDateForEtag(doc) {
  if (!doc) {
    return new Date(0);
  }
  if (isValidDate(doc.upd_date)) {
    return doc.upd_date;
  }
  if (isValidDate(doc.cr_date)) {
    return doc.cr_date;
  }
  const id = doc._id;
  if (id && typeof id.getTimestamp === "function") {
    try {
      const fromId = id.getTimestamp();
      if (isValidDate(fromId)) {
        return fromId;
      }
    } catch (_err) {
      /* ignore */
    }
  }
  return new Date(0);
}

function encodeEtagFromItemDoc(doc) {
  return encodeEtagFromDate(resolveVersionDateForEtag(doc));
}

function decodeIfMatch(ifMatch) {
  const clean = ifMatch.trim();
  if (!/^W\/".+"$/.test(clean)) {
    return null;
  }

  const encoded = clean.slice(3, -1);
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const asDate = new Date(decoded);
    if (Number.isNaN(asDate.valueOf())) {
      return null;
    }
    return asDate;
  } catch (_error) {
    return null;
  }
}

module.exports = {
  encodeEtagFromDate,
  encodeEtagFromItemDoc,
  decodeIfMatch,
};
