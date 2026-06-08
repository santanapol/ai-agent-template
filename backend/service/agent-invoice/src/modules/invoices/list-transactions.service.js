import { isValidObjectId } from '../../lib/object-id.js';

import { mapTransactionForApi } from '../../lib/invoice-serialize.js';

import * as invoiceRepo from './invoice.repository.js';

import * as masterDataRepo from './master-data.repository.js';

import * as transactionRepo from './transaction.repository.js';



/**

 * @param {{ id: string, ouId: string }} params

 */

export async function listInvoiceTransactions({ id, ouId }) {

  if (!isValidObjectId(id)) {

    return { success: false, code: 'INVALID_PARAM' };

  }



  const invoice = await invoiceRepo.findById(id, ouId);

  if (!invoice) {

    return { success: false, code: 'RESOURCE_NOT_FOUND' };

  }



  const txns = await transactionRepo.findByInvoiceId({ refIvId: id });

  const recordOuId = String(invoice.ou_id);

  const ouName = await masterDataRepo.findOrganizationNameByOuId(recordOuId);

  const branchName = await masterDataRepo.findBranchDisplayName(String(invoice.branch_id));



  const companyIds = [...new Set(txns.map((row) => row.company_id))];

  const categoryIds = [...new Set(txns.map((row) => row.main_category_id))];

  const [companyNames, categoryNames] = await Promise.all([

    masterDataRepo.findGameCompanyNamesByIds(companyIds),

    masterDataRepo.findGameMainCategoryNamesByIds(categoryIds),

  ]);



  const data = txns.map((row) =>

    mapTransactionForApi(row, {

      ouName,

      branchName,

      companyName: companyNames.get(String(row.company_id)) ?? null,

      mainCategoryName: categoryNames.get(String(row.main_category_id)) ?? null,

    }),

  );



  return { success: true, code: 'SUCCESS', data };

}

