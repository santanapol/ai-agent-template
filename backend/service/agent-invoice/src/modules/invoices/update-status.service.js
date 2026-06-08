import { isValidObjectId } from '../../lib/object-id.js';

import { mapInvoiceForApi } from '../../lib/invoice-serialize.js';

import { ROUTE_PROG } from '../../lib/route-prog.js';

import * as invoiceRepo from './invoice.repository.js';

import * as masterDataRepo from './master-data.repository.js';



const PROG = ROUTE_PROG.INVOICES_STATUS;



/**

 * @param {{ id: string, status: string, actor: string, ouId: string }} params

 */

export async function updateInvoiceStatus({ id, status, actor, ouId }) {

  if (!isValidObjectId(id)) {

    return { success: false, code: 'INVALID_PARAM' };

  }



  if (status !== 'PAID') {

    return { success: false, code: 'INVALID_PARAM' };

  }



  const invoice = await invoiceRepo.findById(id, ouId);

  if (!invoice) {

    return { success: false, code: 'RESOURCE_NOT_FOUND' };

  }



  if (invoice.status !== 'READY') {

    return { success: false, code: 'INVALID_PARAM' };

  }



  await invoiceRepo.updateStatus({

    id,

    status: 'PAID',

    actor,

    prog: PROG,

  });



  const updated = await invoiceRepo.findDetailById(id, ouId);

  const recordOuId = String(updated.ou_id);

  const [branchName, ouName] = await Promise.all([

    masterDataRepo.findBranchDisplayName(String(updated.branch_id)),

    masterDataRepo.findOuDisplayName(recordOuId),

  ]);



  return {

    success: true,

    code: 'SUCCESS',

    data: mapInvoiceForApi(updated, { branchName, ouName }),

  };

}

