import { successEnvelope } from "../../lib/envelope.js";
import CODES from "../../lib/error-codes.js";
import * as service from "./items.service.js";

function getRouteTemplate(request) {
  return request.routeOptions.url || request.routerPath || request.url;
}

function sendItemResponse(reply, statusCode, result, location) {
  if (result.etag) {
    reply.header("etag", String(result.etag));
  }
  if (location) {
    reply.header("location", location);
  }
  const successCode = statusCode === 201 ? CODES.CREATED : CODES.SUCCESS;
  return reply
    .status(statusCode)
    .send(successEnvelope(result.item, null, successCode));
}

export async function list(request, reply) {
  const result = await service.listItems(request.query, request.userContext);
  return reply
    .status(200)
    .send(successEnvelope(result.items, null, "SUCCESS", result.pagination));
}

export async function create(request, reply) {
  const routeTemplate = getRouteTemplate(request);
  const result = await service.createItem(
    request.body,
    request.userContext,
    routeTemplate,
  );
  return sendItemResponse(
    reply,
    201,
    result,
    `/api/v1/items/${result.item.id}`,
  );
}

export async function detail(request, reply) {
  const result = await service.getItemById(
    request.params.itemId,
    request.userContext,
  );
  return sendItemResponse(reply, 200, result);
}

export async function replace(request, reply) {
  const routeTemplate = getRouteTemplate(request);
  const result = await service.replaceItem(
    request.params.itemId,
    request.body,
    request.userContext,
    routeTemplate,
    request.headers["if-match"],
  );
  return sendItemResponse(reply, 200, result);
}

export async function update(request, reply) {
  const routeTemplate = getRouteTemplate(request);
  const result = await service.patchItem(
    request.params.itemId,
    request.body,
    request.userContext,
    routeTemplate,
    request.headers["if-match"],
  );
  return sendItemResponse(reply, 200, result);
}

export async function remove(request, reply) {
  await service.deleteItem(
    request.params.itemId,
    request.userContext,
    request.headers["if-match"],
  );
  return reply.status(200).send(successEnvelope({ deleted: true }));
}
