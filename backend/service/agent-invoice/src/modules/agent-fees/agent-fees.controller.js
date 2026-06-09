import * as service from "./agent-fees.service.js";
import {
  extractContext,
  handleError,
  extractUpdDateISO,
} from "../../lib/request-handler.js";
import { buildEtag } from "../../lib/etag.js";

export const getFeesHandler = async (request, reply) => {
  const { agentId } = request.params;
  const { page, limit } = request.query;
  const { ouId } = extractContext(request);
  const db = request.server.db;
  const requestId = request.requestId;

  try {
    const { fees, total } = await service.getFeesByAgentId(
      db,
      agentId,
      ouId,
      page,
      limit,
    );

    return reply.status(200).send({
      success: true,
      code: "SUCCESS",
      message: "Success.",
      data: fees,
      pagination: { page, limit, total },
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const createFeeHandler = async (request, reply) => {
  const { agentId } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const result = await service.createFeeByAgentId(
      db,
      agentId,
      ouId,
      request.body,
      userId,
    );
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

export const updateFeeHandler = async (request, reply) => {
  const { agentId, feeId } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    const result = await service.updateFeeByAgentId(
      db,
      agentId,
      feeId,
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

export const deleteFeeHandler = async (request, reply) => {
  const { agentId, feeId } = request.params;
  const { ouId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    await service.deleteFeeByAgentId(db, agentId, feeId, ouId, updDateISO);

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
