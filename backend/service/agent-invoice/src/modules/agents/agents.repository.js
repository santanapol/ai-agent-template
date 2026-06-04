import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agents';

export const listAgents = async (db, ouId, search, skip = 0, limit = 20) => {
  const query = { ou_id: new ObjectId(ouId), active: { $ne: false } };
  
  if (search) {
    query.$or = [
      { branch_code: { $regex: search, $options: 'i' } },
      { branch_name: { $regex: search, $options: 'i' } }
    ];
  }

  return db.collection(COLLECTION_NAME)
    .find(query)
    .skip(skip)
    .limit(limit)
    .toArray();
};

export const countAgents = async (db, ouId, search) => {
  const query = { ou_id: new ObjectId(ouId), active: { $ne: false } };

  if (search) {
    query.$or = [
      { branch_code: { $regex: search, $options: 'i' } },
      { branch_name: { $regex: search, $options: 'i' } }
    ];
  }

  return db.collection(COLLECTION_NAME).countDocuments(query);
};

export const getAgentById = async (db, id, ouId) => {
  return db.collection(COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
    ou_id: new ObjectId(ouId),
    active: { $ne: false }
  });
};

export const findByBranchId = async (db, ouId, branchId) => {
  return db.collection(COLLECTION_NAME).findOne({
    ou_id: new ObjectId(ouId),
    branch_id: new ObjectId(branchId),
    active: { $ne: false }
  });
};

export const createAgent = async (db, agentData) => {
  return db.collection(COLLECTION_NAME).insertOne(agentData);
};

export const updateAgent = async (db, id, ouId, previousUpdDate, updateData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    {
      _id: new ObjectId(id),
      ou_id: new ObjectId(ouId),
      upd_date: new Date(previousUpdDate),
      active: { $ne: false }
    },
    { $set: updateData }
  );
};

export const softDeleteAgent = async (db, id, ouId, previousUpdDate, updateData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    {
      _id: new ObjectId(id),
      ou_id: new ObjectId(ouId),
      upd_date: new Date(previousUpdDate),
      active: { $ne: false }
    },
    { $set: { ...updateData, active: false } }
  );
};

// For sync (upsert logic if needed, but spec says one-time manual sync)
export const upsertAgentSync = async (db, ouId, branchId, agentData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    { ou_id: new ObjectId(ouId), branch_id: new ObjectId(branchId) },
    { $set: agentData },
    { upsert: true }
  );
};
