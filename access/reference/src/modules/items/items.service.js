"use strict";

const HttpError = require("../../utils/http-error");
const CODES = require("../../utils/error-codes");
const { decodeIfMatch } = require("../../utils/etag");
const repository = require("./items.repository");

function normalizeCreatePayload(body) {
  return {
    code: body.code,
    name: body.name,
    description: body.description ?? null,
    status: body.status,
    tags: body.tags || [],
  };
}

async function listItems(query, userContext) {
  return repository.listItems(query, userContext);
}

async function createItem(body, userContext, routeTemplate) {
  return repository.createItem(
    normalizeCreatePayload(body),
    userContext,
    routeTemplate,
  );
}

async function getItemById(itemId, userContext) {
  const found = await repository.findById(itemId, userContext);
  if (!found) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  return found;
}

function parseIfMatch(ifMatch) {
  if (!ifMatch || typeof ifMatch !== "string") {
    throw new HttpError(
      428,
      CODES.PRECONDITION_REQUIRED,
      "If-Match header is required for this operation.",
    );
  }

  const parsed = decodeIfMatch(ifMatch);
  if (!parsed) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "ETag does not match current version.",
    );
  }

  return parsed;
}

async function replaceItem(itemId, body, userContext, routeTemplate, ifMatch) {
  const ifMatchDate = parseIfMatch(ifMatch);
  const existing = await repository.findById(itemId, userContext);

  if (!existing) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  const payload = normalizeCreatePayload(body);
  const replaced = await repository.replaceById(
    itemId,
    payload,
    userContext,
    routeTemplate,
    ifMatchDate,
  );

  if (!replaced.matchedCount) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "ETag does not match current version.",
    );
  }

  const latest = await repository.findById(itemId, userContext);
  return latest;
}

async function patchItem(itemId, body, userContext, routeTemplate, ifMatch) {
  const ifMatchDate = parseIfMatch(ifMatch);
  const existing = await repository.findById(itemId, userContext);

  if (!existing) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  const patched = await repository.patchById(
    itemId,
    body,
    userContext,
    routeTemplate,
    ifMatchDate,
  );
  if (!patched.matchedCount) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "ETag does not match current version.",
    );
  }

  return {
    item: patched.item,
    etag: patched.etag,
    updDate: patched.doc.upd_date,
  };
}

async function deleteItem(itemId, userContext, ifMatch) {
  const ifMatchDate = parseIfMatch(ifMatch);
  const exists = await repository.existsById(itemId, userContext);

  if (!exists) {
    throw new HttpError(
      404,
      CODES.RESOURCE_NOT_FOUND,
      "The requested resource was not found",
    );
  }

  const deletedCount = await repository.deleteById(
    itemId,
    userContext,
    ifMatchDate,
  );
  if (!deletedCount) {
    throw new HttpError(
      412,
      CODES.VERSION_CONFLICT,
      "ETag does not match current version.",
    );
  }
}

module.exports = {
  listItems,
  createItem,
  getItemById,
  replaceItem,
  patchItem,
  deleteItem,
};
