import { ObjectId, MongoClient } from 'mongodb';
import * as repository from './agents.repository.js';

export const getAgents = async (db, ouId, search, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [agents, total] = await Promise.all([
    repository.listAgents(db, ouId, search, skip, limit),
    repository.countAgents(db, ouId, search)
  ]);
  return { agents, total };
};

export const getAgentDetail = async (db, id, ouId) => {
  const agent = await repository.getAgentById(db, id, ouId);
  if (!agent) {
    const error = new Error('Agent not found.');
    error.statusCode = 404;
    throw error;
  }
  return agent;
};

export const createAgent = async (db, ouId, payload, userId) => {
  let feeRate = payload.default_fee_rate;
  if (feeRate === null || feeRate === undefined) {
    const error = new Error('default_fee_rate cannot be null. Assumed 0% but operation stopped.');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const prog = '/api/v1/agent-invoice/agents';
  const agentData = {
    ...payload,
    ou_id: new ObjectId(ouId),
    parent_branch_id: payload.parent_branch_id ? new ObjectId(payload.parent_branch_id) : null,
    active: true,
    cr_by: userId,
    cr_date: now,
    cr_prog: prog,
    upd_by: userId,
    upd_date: now,
    upd_prog: prog
  };

  const insertResult = await repository.createAgent(db, agentData);
  return { insertedId: insertResult.insertedId, upd_date: now.toISOString() };
};

export const updateAgent = async (db, id, ouId, payload, updDateStr, userId) => {
  if (payload.default_fee_rate === null) {
    const error = new Error('default_fee_rate cannot be null. Assumed 0% but operation stopped.');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const updateData = {
    ...payload,
    upd_by: userId,
    upd_date: now,
    upd_prog: '/api/v1/agent-invoice/agents/:id'
  };

  if (payload.parent_branch_id !== undefined) {
    updateData.parent_branch_id = payload.parent_branch_id ? new ObjectId(payload.parent_branch_id) : null;
  }

  const result = await repository.updateAgent(db, id, ouId, updDateStr, updateData);

  if (result.matchedCount === 0) {
    const error = new Error('Resource was modified by another request or not found. Refresh and retry.');
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
    upd_prog: '/api/v1/agent-invoice/agents/:id'
  };

  const result = await repository.softDeleteAgent(db, id, ouId, updDateStr, updateData);

  if (result.matchedCount === 0) {
    const error = new Error('Resource was modified by another request or not found. Refresh and retry.');
    error.statusCode = 412;
    throw error;
  }

  return { upd_date: now.toISOString() };
};

// Use env variable or fallback to local DB for testing if external DB is not accessible
const SOURCE_MONGO_URI = process.env.SOURCE_MONGODB_URI || process.env.MONGODB_URI;
let sourceClient = null;

const getSourceDb = async () => {
  if (!sourceClient) {
    sourceClient = new MongoClient(SOURCE_MONGO_URI);
    await sourceClient.connect();
  }
  
  // If we are using the local DB fallback, we can use the same DB or 'gpp_777ww'
  const sourceDbName = process.env.SOURCE_MONGODB_URI ? 'gpp_777ww' : (process.env.DB_NAME || 'agent-invoice');
  return sourceClient.db(sourceDbName);
};

export const syncAgent = async (db, ouId, branchId, userId) => {
  const sourceDb = await getSourceDb();
  const sourceCollection = sourceDb.collection('su_branch');

  const sourceData = await sourceCollection.findOne({ _id: new ObjectId(branchId) });
  if (!sourceData) {
    const error = new Error(`Branch ID ${branchId} not found in source database.`);
    error.statusCode = 404;
    throw error;
  }

  const existingAgent = await repository.findByBranchId(db, sourceData.ou_id || ouId, sourceData._id);
  const now = new Date();
  
  if (!existingAgent) {
    const finalData = {
      ou_id: sourceData.ou_id ? new ObjectId(sourceData.ou_id) : new ObjectId(ouId),
      branch_id: sourceData._id,
      branch_code: sourceData.branch_code,
      branch_name: sourceData.branch_name,
      branch_desc: sourceData.branch_desc || null,
      branch_type: sourceData.branch_type,
      parent_branch_id: sourceData.reference_branch ? new ObjectId(sourceData.reference_branch) : null,
      currency: sourceData.currency,
      default_fee_rate: 0,
      active: true,
      cr_by: userId,
      cr_date: now,
      cr_prog: '/api/v1/agent-invoice/agents/sync',
      upd_by: userId,
      upd_date: now,
      upd_prog: '/api/v1/agent-invoice/agents/sync'
    };
    await db.collection('agents').insertOne(finalData);
    return { syncedId: finalData.branch_id.toString(), branch_code: finalData.branch_code };
  } else {
    const updateData = {
      branch_code: sourceData.branch_code,
      branch_name: sourceData.branch_name,
      branch_desc: sourceData.branch_desc || null,
      branch_type: sourceData.branch_type,
      parent_branch_id: sourceData.reference_branch ? new ObjectId(sourceData.reference_branch) : null,
      currency: sourceData.currency,
      active: true,
      upd_by: userId,
      upd_date: now,
      upd_prog: '/api/v1/agent-invoice/agents/sync'
    };
    await db.collection('agents').updateOne(
      { _id: existingAgent._id },
      { $set: updateData }
    );
    return { syncedId: existingAgent.branch_id.toString(), branch_code: updateData.branch_code };
  }
};

export const getUnsyncedBranches = async (db, ouId, includeInactive = false) => {
  // Get existing branch_ids
  const existingAgents = await db.collection('agents').find({ ou_id: new ObjectId(ouId) }).project({ branch_id: 1 }).toArray();
  const existingBranchIds = existingAgents.map(a => a.branch_id).filter(Boolean);

  const sourceDb = await getSourceDb();
  const sourceCollection = sourceDb.collection('su_branch');

  const query = { _id: { $nin: existingBranchIds } };
  if (!includeInactive) {
    query.active = { $nin: ['0', 0, false] };
  }

  const unsynced = await sourceCollection.find(query)
    .project({ _id: 1, branch_code: 1, branch_name: 1, active: 1 })
    .sort({ branch_name: 1 }).toArray();

  return unsynced.map(u => ({
    branch_id: u._id.toString(),
    branch_code: u.branch_code,
    branch_name: u.branch_name,
    active: !['0', 0, false].includes(u.active)
  }));
};
