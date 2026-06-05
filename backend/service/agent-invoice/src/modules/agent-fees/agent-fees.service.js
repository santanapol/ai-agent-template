import { ObjectId } from 'mongodb';
import * as repository from './agent-fees.repository.js';

const resolveTargetBranchId = async (db, agentId, ouId) => {
  const agent = await db.collection('agents').findOne({
    _id: new ObjectId(agentId),
    ou_id: new ObjectId(ouId),
    active: { $ne: false }
  });
  if (!agent) {
    const error = new Error('Agent not found or inactive.');
    error.statusCode = 404;
    throw error;
  }
  return agent.branch_id;
};

export const getFeesByAgentId = async (db, agentId, ouId, page = 1, limit = 20) => {
  const targetBranchId = await resolveTargetBranchId(db, agentId, ouId);
  const skip = (page - 1) * limit;
  const [fees, total] = await Promise.all([
    repository.findByTargetBranchId(db, ouId, targetBranchId, skip, limit),
    repository.countByTargetBranchId(db, ouId, targetBranchId)
  ]);
  return { fees, total };
};

export const createFeeByAgentId = async (db, agentId, ouId, payload, userId) => {
  const targetBranchId = await resolveTargetBranchId(db, agentId, ouId);
  const existing = await repository.findByUniqueFields(
    db, ouId, targetBranchId, payload.game_company_id, payload.game_main_cate_id
  );
  if (existing) {
    const error = new Error('Fee override for this company and category already exists.');
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  const prog = '/api/v1/agent-invoice/agents/:agentId/fees';
  const feeData = {
    ...payload,
    game_company_id: new ObjectId(payload.game_company_id),
    game_main_cate_id: new ObjectId(payload.game_main_cate_id),
    ou_id: new ObjectId(ouId),
    branch_id: targetBranchId,
    cr_by: userId,
    cr_date: now,
    cr_prog: prog,
    upd_by: userId,
    upd_date: now,
    upd_prog: prog
  };

  const insertResult = await repository.createFee(db, feeData);
  return { insertedId: insertResult.insertedId, upd_date: now.toISOString() };
};

export const updateFeeByAgentId = async (db, agentId, feeId, ouId, updatePayload, updDateStr, userId) => {
  const targetBranchId = await resolveTargetBranchId(db, agentId, ouId);
  const now = new Date();
  const updateData = {
    ...updatePayload,
    upd_by: userId,
    upd_date: now,
    upd_prog: '/api/v1/agent-invoice/agents/:agentId/fees/:feeId'
  };

  const result = await repository.updateFee(db, feeId, ouId, targetBranchId, updDateStr, updateData);

  if (result.matchedCount === 0) {
    const error = new Error('Resource was modified by another request. Refresh and retry.');
    error.statusCode = 412;
    throw error;
  }

  return { upd_date: now.toISOString() };
};

export const deleteFeeByAgentId = async (db, agentId, feeId, ouId) => {
  const targetBranchId = await resolveTargetBranchId(db, agentId, ouId);
  const result = await repository.deleteFee(db, feeId, ouId, targetBranchId);

  if (result.deletedCount === 0) {
    const error = new Error('Fee record not found or already deleted.');
    error.statusCode = 404;
    throw error;
  }

  return result;
};
