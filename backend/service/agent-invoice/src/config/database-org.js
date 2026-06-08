/**
 * @deprecated Use database-invoice.js (MONGODB_URI_INVOICE / MONGODB_DB_INVOICE).
 */
export {
  closeInvoiceDatabase as closeOrgDatabase,
  connectInvoiceDatabase as connectOrgDatabase,
  getInvoiceDatabase as getOrgDatabase,
  pingInvoiceDatabase as pingOrgDatabase,
} from './database-invoice.js';
