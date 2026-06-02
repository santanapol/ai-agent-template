import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agent_category_fees';

export const findByAgentId = async (db, agentId, skip = 0, limit = 20) => {
  return await db.collection(COLLECTION_NAME)
    .find({ agent_id: new ObjectId(agentId) })
    .skip(skip)
    .limit(limit)
    .toArray();
};

export const countByAgentId = async (db, agentId) => {
  return await db.collection(COLLECTION_NAME)
    .countDocuments({ agent_id: new ObjectId(agentId) });
};

export const findByUniqueFields = async (db, agentId, companyId, mainCateId) => {
  return await db.collection(COLLECTION_NAME).findOne({
    agent_id: new ObjectId(agentId),
    company_id: companyId,
    main_cate_id: mainCateId
  });
};

export const createFee = async (db, feeData) => {
  if (feeData.agent_id && typeof feeData.agent_id === 'string') {
    feeData.agent_id = new ObjectId(feeData.agent_id);
  }
  return await db.collection(COLLECTION_NAME).insertOne(feeData);
};

export const updateFee = async (db, feeId, previousUpdDate, updateData) => {
  const query = {
    _id: new ObjectId(feeId),
    upd_date: new Date(previousUpdDate)
  };
  
  const update = {
    $set: updateData
  };
  
  return await db.collection(COLLECTION_NAME).updateOne(query, update);
};

export const deleteFee = async (db, feeId, agentId) => {
  return await db.collection(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(feeId),
    agent_id: new ObjectId(agentId)
  });
};
