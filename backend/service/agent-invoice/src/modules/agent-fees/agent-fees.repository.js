import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agent_category_fees';

export const findByAgentId = async (db, agentId, ouId, branchId, skip = 0, limit = 20) => {
  return db.collection(COLLECTION_NAME)
    .find({
      agent_id: new ObjectId(agentId),
      ou_id: ouId,
      branch_id: branchId
    })
    .skip(skip)
    .limit(limit)
    .toArray();
};

export const countByAgentId = async (db, agentId, ouId, branchId) => {
  return db.collection(COLLECTION_NAME).countDocuments({
    agent_id: new ObjectId(agentId),
    ou_id: ouId,
    branch_id: branchId
  });
};

export const findByUniqueFields = async (db, agentId, ouId, branchId, companyId, mainCateId) => {
  return db.collection(COLLECTION_NAME).findOne({
    agent_id: new ObjectId(agentId),
    ou_id: ouId,
    branch_id: branchId,
    company_id: companyId,
    main_cate_id: mainCateId
  });
};

export const createFee = async (db, feeData) => {
  return db.collection(COLLECTION_NAME).insertOne(feeData);
};

export const updateFee = async (db, feeId, ouId, branchId, previousUpdDate, updateData) => {
  return db.collection(COLLECTION_NAME).updateOne(
    {
      _id: new ObjectId(feeId),
      ou_id: ouId,
      branch_id: branchId,
      upd_date: new Date(previousUpdDate)
    },
    { $set: updateData }
  );
};

export const deleteFee = async (db, feeId, agentId, ouId, branchId) => {
  return db.collection(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(feeId),
    agent_id: new ObjectId(agentId),
    ou_id: ouId,
    branch_id: branchId
  });
};
