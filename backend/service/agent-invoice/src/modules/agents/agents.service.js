import { ObjectId } from "mongodb";

import { getBranchDatabase } from "../../config/database-read.js";
import * as repository from "./agents.repository.js";

export const getAgents = async (db, ouId, search, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [agents, total] = await Promise.all([
    repository.listAgents(db, ouId, search, skip, limit),
    repository.countAgents(db, ouId, search),
  ]);
  return { agents, total };
};

export const getAgentDetail = async (db, id, ouId) => {
  const agent = await repository.getAgentById(db, id, ouId);
  if (!agent) {
    const error = new Error("Agent not found.");
    error.statusCode = 404;
    throw error;
  }
  return agent;
};

export const resolveAgentBranchId = async (db, agentId, ouId) => {
  const agent = await repository.getAgentById(db, agentId, ouId);
  if (!agent) {
    const error = new Error("Agent not found or inactive.");
    error.statusCode = 404;
    throw error;
  }
  return agent.branch_id;
};

export const createAgent = async (db, ouId, payload, userId) => {
  const now = new Date();
  const prog = "/api/v1/agent-invoice/agents";
  const agentData = {
    ...payload,
    branch_id: new ObjectId(payload.branch_id),
    ou_id: new ObjectId(ouId),
    parent_branch_id: payload.parent_branch_id
      ? new ObjectId(payload.parent_branch_id)
      : null,
    ref_fee_branch_id: payload.ref_fee_branch_id
      ? new ObjectId(payload.ref_fee_branch_id)
      : null,
    active: true,
    cr_by: userId,
    cr_date: now,
    cr_prog: prog,
    upd_by: userId,
    upd_date: now,
    upd_prog: prog,
  };

  const insertResult = await repository.createAgent(db, agentData);
  return { insertedId: insertResult.insertedId, upd_date: now.toISOString() };
};

export const updateAgent = async (
  db,
  id,
  ouId,
  payload,
  updDateStr,
  userId,
) => {
  const now = new Date();
  const updateData = {
    ...payload,
    upd_by: userId,
    upd_date: now,
    upd_prog: "/api/v1/agent-invoice/agents/:id",
  };

  if (payload.parent_branch_id !== undefined) {
    updateData.parent_branch_id = payload.parent_branch_id
      ? new ObjectId(payload.parent_branch_id)
      : null;
  }

  if (payload.ref_fee_branch_id !== undefined) {
    updateData.ref_fee_branch_id = payload.ref_fee_branch_id
      ? new ObjectId(payload.ref_fee_branch_id)
      : null;
  }

  const result = await repository.updateAgent(
    db,
    id,
    ouId,
    updDateStr,
    updateData,
  );

  if (result.matchedCount === 0) {
    const error = new Error(
      "Resource was modified by another request or not found. Refresh and retry.",
    );
    error.statusCode = 412;
    throw error;
  }

  return { upd_date: now.toISOString() };
};

export const softDeleteAgent = async (db, id, ouId, updDateStr, userId) => {
  const now = new Date();
  const updateData = {
    upd_by: userId,
    upd_date: now,
    upd_prog: "/api/v1/agent-invoice/agents/:id",
  };

  const result = await repository.softDeleteAgent(
    db,
    id,
    ouId,
    updDateStr,
    updateData,
  );

  if (result.matchedCount === 0) {
    const error = new Error(
      "Resource was modified by another request or not found. Refresh and retry.",
    );
    error.statusCode = 412;
    throw error;
  }

  return { upd_date: now.toISOString() };
};

export const syncAgent = async (db, ouId, branchId, userId, readDb) => {
  const branchDatabase = readDb ?? getBranchDatabase();
  const sourceData = await branchDatabase
    .collection("su_branch")
    .findOne({ _id: new ObjectId(branchId), ou_id: new ObjectId(ouId) });
  if (!sourceData) {
    const error = new Error("Branch not found in source database.");
    error.statusCode = 404;
    throw error;
  }

  const existingAgent = await repository.findByBranchId(
    db,
    sourceData.ou_id || ouId,
    sourceData._id,
  );
  const now = new Date();
  const prog = "/api/v1/agent-invoice/agents/sync";

  if (!existingAgent) {
    const finalData = {
      ou_id: sourceData.ou_id
        ? new ObjectId(sourceData.ou_id)
        : new ObjectId(ouId),
      branch_id: sourceData._id,
      branch_code: sourceData.branch_code,
      branch_name: sourceData.branch_name,
      branch_desc: sourceData.branch_desc || null,
      branch_type: sourceData.branch_type,
      parent_branch_id: sourceData.reference_branch
        ? new ObjectId(sourceData.reference_branch)
        : null,
      ref_fee_branch_id: null,
      currency: sourceData.currency,
      default_fee_rate: 0,
      active: true,
      cr_by: userId,
      cr_date: now,
      cr_prog: prog,
      upd_by: userId,
      upd_date: now,
      upd_prog: prog,
    };
    await repository.createAgent(db, finalData);
    return {
      syncedId: finalData.branch_id.toString(),
      branch_code: finalData.branch_code,
    };
  } else {
    const updateData = {
      branch_code: sourceData.branch_code,
      branch_name: sourceData.branch_name,
      branch_desc: sourceData.branch_desc || null,
      branch_type: sourceData.branch_type,
      parent_branch_id: sourceData.reference_branch
        ? new ObjectId(sourceData.reference_branch)
        : null,
      currency: sourceData.currency,
      active: true,
      upd_by: userId,
      upd_date: now,
      upd_prog: prog,
    };
    await repository.syncUpdateAgent(db, existingAgent._id, updateData);
    return {
      syncedId: existingAgent.branch_id.toString(),
      branch_code: updateData.branch_code,
    };
  }
};

export const getUnsyncedBranches = async (
  db,
  ouId,
  includeInactive = false,
  readDb,
) => {
  const branchDatabase = readDb ?? getBranchDatabase();
  const existingAgents = await repository.getAgentBranchIds(db, ouId);
  const existingBranchIds = existingAgents
    .map((a) => a.branch_id)
    .filter(Boolean);

  const query = { ou_id: new ObjectId(ouId), _id: { $nin: existingBranchIds } };
  if (!includeInactive) {
    query.active = { $nin: ["0", 0, false] };
  }

  const unsynced = await branchDatabase
    .collection("su_branch")
    .find(query)
    .project({ _id: 1, branch_code: 1, branch_name: 1, active: 1 })
    .sort({ branch_name: 1 })
    .toArray();

  return unsynced.map((u) => ({
    branch_id: u._id.toString(),
    branch_code: u.branch_code,
    branch_name: u.branch_name,
    active: !["0", 0, false].includes(u.active),
  }));
};
