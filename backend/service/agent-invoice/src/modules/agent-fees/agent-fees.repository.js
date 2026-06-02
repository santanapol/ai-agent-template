import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'agent_category_fees';

export const findByAgentId = async (db, agentId) => {
  return await db.collection(COLLECTION_NAME)
    .find({ agent_id: new ObjectId(agentId) })
    .toArray();
};
