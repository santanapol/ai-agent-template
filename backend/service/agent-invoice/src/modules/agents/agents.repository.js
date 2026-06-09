import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agents';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listAgents = async (db, ouId, search, skip = 0, limit = 20) => {
  const query = { ou_id: new ObjectId(ouId), active: { $ne: false } };

  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { branch_code: { $regex: safe, $options: 'i' } },
      { branch_name: { $regex: safe, $options: 'i' } },
    ];
  }

  return db.collection(COLLECTION_NAME).aggregate([
    { $match: query },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: COLLECTION_NAME,
        localField: 'ref_fee_branch_id',
        foreignField: 'branch_id',
        as: 'ref_agent'
      }
    },
    {
      $addFields: {
        ref_fee_branch_name: { $arrayElemAt: ['$ref_agent.branch_name', 0] }
      }
    },
    {
      $project: {
        ref_agent: 0
      }
    }
  ]).toArray();
};

export const countAgents = async (db, ouId, search) => {
  const query = { ou_id: new ObjectId(ouId), active: { $ne: false } };

  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { branch_code: { $regex: safe, $options: 'i' } },
      { branch_name: { $regex: safe, $options: 'i' } },
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

export const upsertAgentSync = async (db, ouId, branchId, agentData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    { ou_id: new ObjectId(ouId), branch_id: new ObjectId(branchId) },
    { $set: agentData },
    { upsert: true }
  );
};

export const syncUpdateAgent = async (db, id, updateData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    { _id: id },
    { $set: updateData }
  );
};

export const getAgentBranchIds = async (db, ouId) => {
  return db.collection(COLLECTION_NAME)
    .find({ ou_id: new ObjectId(ouId) })
    .project({ branch_id: 1 })
    .toArray();
};
