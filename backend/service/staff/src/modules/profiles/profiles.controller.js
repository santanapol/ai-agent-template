import { successEnvelope } from "../../lib/envelope.js";
import CODES from "../../lib/error-codes.js";
import * as service from "./profiles.service.js";

function getRouteTemplate(request) {
  return (
    request.routeOptions.url || request.routerPath || request.url.split("?")[0]
  );
}

function sendProfileResponse(reply, result) {
  if (result.etag) {
    reply.header("etag", String(result.etag));
  }
  return reply
    .status(200)
    .send(successEnvelope(result.profile, null, CODES.SUCCESS));
}

function sendCreatedProfileResponse(reply, result) {
  if (result.etag) {
    reply.header("etag", String(result.etag));
  }
  reply.header("location", `/api/v1/staff/profiles/${result.profile.id}`);
  return reply
    .status(201)
    .send(successEnvelope(result.profile, null, CODES.CREATED));
}

export async function getProfileById(request, reply) {
  const result = await service.getProfileById(
    request.params.profileId,
    request.userContext,
  );
  return sendProfileResponse(reply, result);
}

export async function listOrLookupProfiles(request, reply) {
  const query = request.query;

  if (query.user_id) {
    service.assertLookupQueryExclusive(query);
    const result = await service.lookupProfileByUserId(
      query.user_id,
      request.userContext,
    );
    return sendProfileResponse(reply, result);
  }

  const result = await service.listProfiles(query, request.userContext);
  return reply
    .status(200)
    .send(
      successEnvelope(result.profiles, null, CODES.SUCCESS, result.pagination),
    );
}

export async function createProfile(request, reply) {
  const result = await service.createProfile(
    request.body,
    request.userContext,
    getRouteTemplate(request),
  );
  return sendCreatedProfileResponse(reply, result);
}

export async function patchProfile(request, reply) {
  const result = await service.patchProfile(
    request.params.profileId,
    request.body,
    request.headers["if-match"],
    request.userContext,
    getRouteTemplate(request),
  );
  return sendProfileResponse(reply, result);
}

export async function archiveProfile(request, reply) {
  const result = await service.archiveProfile(
    request.params.profileId,
    request.headers["if-match"],
    request.userContext,
    getRouteTemplate(request),
    request.id,
  );
  return sendProfileResponse(reply, result);
}

export async function restoreProfile(request, reply) {
  const result = await service.restoreProfile(
    request.params.profileId,
    request.headers["if-match"],
    request.userContext,
    getRouteTemplate(request),
  );
  return sendProfileResponse(reply, result);
}

export async function resetProfilePassword(request, reply) {
  await service.resetProfilePassword(
    request.params.profileId,
    request.body,
    request.userContext,
    getRouteTemplate(request),
    request.id,
  );
  return reply.status(204).send();
}
