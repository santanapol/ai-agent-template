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
  if (feeData.agent_id) {
    feeData.agent_id = new ObjectId(feeData.agent_id);
  }
  return await db.collection(COLLECTION_NAME).insertOne(feeData);
};
