/**
 * @deprecated Use database-read.js (MONGODB_URI_READ / MONGODB_DB_BRANCH / MONGODB_DB_ORG_DATA).
 */
export {
  closeReadDatabase as closeBranchDatabase,
  connectReadDatabase as connectBranchDatabase,
  getBranchDatabase,
  pingReadDatabase as pingBranchDatabase,
} from './database-read.js';
