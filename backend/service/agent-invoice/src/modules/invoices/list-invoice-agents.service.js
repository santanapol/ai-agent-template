import * as branchRepo from './branch.repository.js';

/**
 * @param {{ ouId: string }} params
 */
export async function listInvoiceAgents({ ouId }) {
  const items = await branchRepo.findBranchesByOuId(ouId);

  return {
    success: true,
    code: 'SUCCESS',
    data: items,
  };
}
