import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agent_category_fees';

export const findByAgentId = async (db, agentId) => {
  return await db.collection(COLLECTION_NAME)
    .find({ agent_id: new ObjectId(agentId) })
    .toArray();
};

export const findByUniqueFields = async (db, agentId, companyId, mainCateId) => {
  return await db.collection(COLLECTION_NAME).findOne({
    agent_id: new ObjectId(agentId),
    company_id: companyId,
    main_cate_id: mainCateId
  });
};

export const createFee = async (db, feeData) => {
  // convert agent_id string to ObjectId before inserting
  if (feeData.agent_id && typeof feeData.agent_id === 'string') {
    feeData.agent_id = new ObjectId(feeData.agent_id);
  }
  return await db.collection(COLLECTION_NAME).insertOne(feeData);
};

export const updateFee = async (db, feeId, previousUpdDate, updateData) => {
  // Use optimistic locking: match by _id AND exact upd_date
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
