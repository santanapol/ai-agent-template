import * as repository from './agent-fees.repository.js';

export const getFeesByAgentId = async (db, agentId) => {
  return await repository.findByAgentId(db, agentId);
};

export const createFeeByAgentId = async (db, agentId, payload, userId = 'system') => {
  // 1. Check unique combination
  const existing = await repository.findByUniqueFields(db, agentId, payload.company_id, payload.main_cate_id);
  if (existing) {
    const error = new Error('Fee override for this company and category already exists');
    error.statusCode = 409; // Conflict
    throw error;
  }

  // 2. Prepare data with audit fields
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

  // 3. Insert
  const result = await repository.createFee(db, feeData);
  return result;
};

export const updateFeeByAgentId = async (db, agentId, feeId, payload, userId = 'system') => {
  const { fee_rate, upd_date } = payload;
  
  const now = new Date();
  const updateData = {
    fee_rate,
    upd_by: userId,
    upd_date: now,
    upd_prog: 'API_UPDATE_FEE'
  };

  const result = await repository.updateFee(db, feeId, upd_date, updateData);
  
  if (result.matchedCount === 0) {
    // If no document matched, it either means it doesn't exist, OR the upd_date has changed (Optimistic Lock failure)
    const error = new Error('Fee record not found or has been modified by another process. Please refresh and try again.');
    error.statusCode = 409; // Conflict
    throw error;
  }
  
  return result;
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
