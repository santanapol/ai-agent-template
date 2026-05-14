"use strict";

const { successEnvelope } = require("../../utils/envelope");
const CODES = require("../../utils/error-codes");
const service = require("./items.service");

function getInput(req, key) {
  return req.validated && req.validated[key] ? req.validated[key] : req[key];
}

function getRouteTemplate(req) {
  const base = req.baseUrl || "";
  const routePath = req.route && req.route.path;
  if (typeof routePath === "string" && routePath.length > 0) {
    return `${base}${routePath}`;
  }
  if (req.params && typeof req.params.itemId === "string") {
    return `${base}/:itemId`;
  }
  return `${base}/`;
}

function sendItemResponse(res, statusCode, result, location) {
  if (
    result.etag !== null &&
    result.etag !== undefined &&
    String(result.etag).length > 0
  ) {
    res.setHeader("etag", String(result.etag));
  }
  if (location) {
    res.setHeader("location", location);
  }
  const successCode = statusCode === 201 ? CODES.CREATED : CODES.SUCCESS;
  return res
    .status(statusCode)
    .json(successEnvelope(result.item, null, successCode));
}

async function list(req, res, next) {
  try {
    const query = getInput(req, "query");
    const result = await service.listItems(query, req.userContext);
    return res
      .status(200)
      .json(successEnvelope(result.items, null, "SUCCESS", result.pagination));
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const body = getInput(req, "body");
    const routeTemplate = getRouteTemplate(req);
    const result = await service.createItem(
      body,
      req.userContext,
      routeTemplate,
    );
    return sendItemResponse(
      res,
      201,
      result,
      `/api/v1/items/${result.item.id}`,
    );
  } catch (error) {
    return next(error);
  }
}

async function detail(req, res, next) {
  try {
    const params = getInput(req, "params");
    const result = await service.getItemById(params.itemId, req.userContext);
    return sendItemResponse(res, 200, result);
  } catch (error) {
    return next(error);
  }
}

async function replace(req, res, next) {
  try {
    const params = getInput(req, "params");
    const body = getInput(req, "body");
    const routeTemplate = getRouteTemplate(req);
    const result = await service.replaceItem(
      params.itemId,
      body,
      req.userContext,
      routeTemplate,
      req.headers["if-match"],
    );
    return sendItemResponse(res, 200, result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const params = getInput(req, "params");
    const body = getInput(req, "body");
    const routeTemplate = getRouteTemplate(req);
    const result = await service.patchItem(
      params.itemId,
      body,
      req.userContext,
      routeTemplate,
      req.headers["if-match"],
    );
    return sendItemResponse(res, 200, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const params = getInput(req, "params");
    await service.deleteItem(
      params.itemId,
      req.userContext,
      req.headers["if-match"],
    );
    return res.status(200).json(successEnvelope({ deleted: true }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  create,
  detail,
  replace,
  update,
  remove,
};
