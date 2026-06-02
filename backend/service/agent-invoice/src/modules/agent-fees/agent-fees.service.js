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
