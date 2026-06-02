import * as repository from './agent-fees.repository.js';

export const getFeesByAgentId = async (db, agentId) => {
  // Can add additional business logic here if needed
  return await repository.findByAgentId(db, agentId);
};
