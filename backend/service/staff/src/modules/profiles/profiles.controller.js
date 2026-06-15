import { successEnvelope } from "../../lib/envelope.js";
import CODES from "../../lib/error-codes.js";
import * as service from "./profiles.service.js";

function getRouteTemplate(request) {
  const url = request.routeOptions.url || request.routerPath;
  if (url) {
    return url;
  }

  const fallback = request.url.split("?")[0];
  request.log.info(
    { url: request.url, fallback },
    "getRouteTemplate: using fallback from request.url",
  );
  return fallback;
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
    { log: request.log },
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
      { log: request.log },
    );
    return sendProfileResponse(reply, result);
  }

  const result = await service.listProfiles(query, request.userContext, {
    log: request.log,
  });
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
    { log: request.log },
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
    { log: request.log },
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
    { log: request.log },
  );
  return sendProfileResponse(reply, result);
}

export async function restoreProfile(request, reply) {
  const result = await service.restoreProfile(
    request.params.profileId,
    request.headers["if-match"],
    request.userContext,
    getRouteTemplate(request),
    { log: request.log },
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
    { log: request.log },
  );
  return reply.status(204).send();
}

export async function changeProfileRole(request, reply) {
  await service.changeProfileRole(
    request.params.profileId,
    request.body,
    request.userContext,
    getRouteTemplate(request),
    request.id,
    { log: request.log },
  );
  return reply.status(204).send();
}
