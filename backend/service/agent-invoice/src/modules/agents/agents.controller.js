import * as service from "./agents.service.js";
import {
  extractContext,
  handleError,
  extractUpdDateISO,
} from "../../lib/request-handler.js";
import { buildEtag } from "../../lib/etag.js";

export const getAgentsHandler = async (request, reply) => {
  const { page, limit, search } = request.query;
  const { ouId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const { agents, total } = await service.getAgents(
      db,
      ouId,
      search,
      page,
      limit,
    );

    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Success.",
      data: agents,
      pagination: { page, limit, total },
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const getAgentDetailHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const agent = await service.getAgentDetail(db, id, ouId);
    reply.header("ETag", buildEtag(agent.upd_date.toISOString()));

    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Success.",
      data: agent,
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const createAgentHandler = async (request, reply) => {
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const result = await service.createAgent(db, ouId, request.body, userId);
    reply.header("ETag", buildEtag(result.upd_date));

    return reply.status(201).send({
      success: true,
      code: "CREATED",
      message: "Resource created successfully.",
      data: { insertedId: result.insertedId.toString() },
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const updateAgentHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    const result = await service.updateAgent(
      db,
      id,
      ouId,
      request.body,
      updDateISO,
      userId,
    );
    reply.header("ETag", buildEtag(result.upd_date));

    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Updated successfully.",
      data: null,
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const deleteAgentHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    const result = await service.softDeleteAgent(
      db,
      id,
      ouId,
      updDateISO,
      userId,
    );
    reply.header("ETag", buildEtag(result.upd_date));

    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Deleted successfully.",
      data: null,
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const syncAgentHandler = async (request, reply) => {
  const { ouId, userId, requestId } = extractContext(request);
  const { branch_id: branchId } = request.body;
  const db = request.server.db;

  try {
    const result = await service.syncAgent(db, ouId, branchId, userId);
    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Sync successful.",
      data: result,
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const getUnsyncedBranchesHandler = async (request, reply) => {
  const { ouId, requestId } = extractContext(request);
  const { includeInactive } = request.query;
  const db = request.server.db;

  try {
    const unsynced = await service.getUnsyncedBranches(
      db,
      ouId,
      includeInactive,
    );
    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Success.",
      data: unsynced,
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};
