import * as repository from './agent-fees.repository.js';

export const getFeesByAgentId = async (db, agentId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const fees = await repository.findByAgentId(db, agentId, skip, limit);
  const total = await repository.countByAgentId(db, agentId);
  return { fees, total };
};

export const createFeeByAgentId = async (db, agentId, payload, userId = 'system') => {
  const existing = await repository.findByUniqueFields(db, agentId, payload.company_id, payload.main_cate_id);
  if (existing) {
    const error = new Error('Fee override for this company and category already exists');
    error.statusCode = 409;
    throw error;
  }

  const now = new Date();
  const feeData = {
    ...payload,
    agent_id: agentId,
    cr_by: userId,
    cr_date: now,
    cr_prog: 'API_CREATE_FEE',
    upd_by: userId,
    upd_date: now,
    upd_prog: 'API_CREATE_FEE'
  };

  const insertResult = await repository.createFee(db, feeData);
  return {
    insertedId: insertResult.insertedId,
    upd_date: now.toISOString()
  };
};

export const updateFeeByAgentId = async (db, agentId, feeId, feeRate, updDateStr, userId = 'system') => {
  const now = new Date();
  const updateData = {
    fee_rate: feeRate,
    upd_by: userId,
    upd_date: now,
    upd_prog: 'API_UPDATE_FEE'
  };

  const result = await repository.updateFee(db, feeId, updDateStr, updateData);
  
  if (result.matchedCount === 0) {
    const error = new Error('Fee record not found or has been modified by another process. Please refresh and try again.');
    error.statusCode = 412; // Version Conflict
    throw error;
  }
  
  return {
    upd_date: now.toISOString()
  };
};

export const deleteFeeByAgentId = async (db, agentId, feeId) => {
  const result = await repository.deleteFee(db, feeId, agentId);
  
  if (result.deletedCount === 0) {
    const error = new Error('Fee record not found or already deleted');
    error.statusCode = 404; // Not Found
    throw error;
  }
  
  return result;
};
