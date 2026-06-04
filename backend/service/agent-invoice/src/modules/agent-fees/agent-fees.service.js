import { ObjectId } from 'mongodb';
import * as repository from './agent-fees.repository.js';

export const getFeesByAgentId = async (db, agentId, ouId, branchId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [fees, total] = await Promise.all([
    repository.findByAgentId(db, agentId, ouId, branchId, skip, limit),
    repository.countByAgentId(db, agentId, ouId, branchId)
  ]);
  return { fees, total };
};

export const createFeeByAgentId = async (db, agentId, ouId, branchId, payload, userId) => {
  const existing = await repository.findByUniqueFields(
    db, agentId, ouId, branchId, payload.company_id, payload.main_cate_id
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
    agent_id: new ObjectId(agentId),
    ou_id: ouId,
    branch_id: branchId,
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

export const updateFeeByAgentId = async (db, agentId, feeId, ouId, branchId, feeRate, updDateStr, userId) => {
  const now = new Date();
  const updateData = {
    fee_rate: feeRate,
    upd_by: userId,
    upd_date: now,
    upd_prog: '/api/v1/agent-invoice/agents/:agentId/fees/:feeId'
  };

  const result = await repository.updateFee(db, feeId, ouId, branchId, updDateStr, updateData);

  if (result.matchedCount === 0) {
    const error = new Error('Resource was modified by another request. Refresh and retry.');
    error.statusCode = 412;
    throw error;
  }

  return { upd_date: now.toISOString() };
};

export const deleteFeeByAgentId = async (db, agentId, feeId, ouId, branchId) => {
  const result = await repository.deleteFee(db, feeId, agentId, ouId, branchId);

  if (result.deletedCount === 0) {
    const error = new Error('Fee record not found or already deleted.');
    error.statusCode = 404;
    throw error;
  }

  return result;
};
