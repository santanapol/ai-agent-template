import fp from 'fastify-plugin';

import { closeInvoiceDatabase, connectInvoiceDatabase } from '../config/database-invoice.js';

async function mongodbInvoicePlugin(fastify) {
  await connectInvoiceDatabase();
  fastify.addHook('onClose', async () => {
    await closeInvoiceDatabase();
  });
}

export default fp(mongodbInvoicePlugin, { name: 'mongodb-invoice' });
