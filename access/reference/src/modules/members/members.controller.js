"use strict";

const { successEnvelope } = require("../../utils/envelope");
const CODES = require("../../utils/error-codes");
const service = require("./members.service");

function getInput(req, key) {
  return req.validated && req.validated[key] ? req.validated[key] : req[key];
}

function getRouteTemplate(req) {
  const base = req.baseUrl || "";
  const routePath = req.route && req.route.path;
  if (typeof routePath === "string" && routePath.length > 0) {
    return `${base}${routePath}`;
  }
  return `${base}/`;
}

function getRole(req) {
  const role = req.headers["x-user-role"];
  return typeof role === "string" ? role : "";
}

async function list(req, res, next) {
  try {
    const params = getInput(req, "params");
    const query = getInput(req, "query");
    const result = await service.listMembers({
      params,
      query,
      userContext: req.userContext,
      role: getRole(req),
    });
    return res
      .status(200)
      .json(
        successEnvelope(result.members, null, CODES.SUCCESS, result.pagination),
      );
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const params = getInput(req, "params");
    const body = getInput(req, "body");
    const created = await service.createMember({
      params,
      body,
      userContext: req.userContext,
      role: getRole(req),
      routeTemplate: getRouteTemplate(req),
    });
    return res
      .status(201)
      .setHeader("location", `${req.baseUrl}/${created.userId}`)
      .json(successEnvelope(created, null, CODES.CREATED));
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const params = getInput(req, "params");
    const body = getInput(req, "body");
    const updated = await service.updateMember({
      params,
      body,
      userContext: req.userContext,
      role: getRole(req),
      routeTemplate: getRouteTemplate(req),
    });
    return res.status(200).json(successEnvelope(updated));
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const params = getInput(req, "params");
    await service.removeMember({
      params,
      userContext: req.userContext,
      role: getRole(req),
    });
    return res.status(200).json(successEnvelope({ deleted: true }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  create,
  update,
  remove,
};
