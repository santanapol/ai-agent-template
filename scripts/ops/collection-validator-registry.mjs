import { COLLECTION_VALIDATORS as authValidators } from "../../backend/auth/scripts/collection-validators.mjs";
import { COLLECTION_VALIDATORS as staffValidators } from "../../backend/service/staff/scripts/collection-validators.mjs";
import { COLLECTION_VALIDATORS as agentInvoiceValidators } from "../../backend/service/agent-invoice/scripts/collection-validators.mjs";
import { COLLECTION_VALIDATORS as smartReportValidators } from "../../backend/service/smart-report/scripts/collection-validators.mjs";

/** @type {Record<string, Array<{ collection: string, schema: object }>>} */
export const VALIDATORS_BY_DB = {
  "zero-platform": [...authValidators, ...staffValidators],
  "zero-agent-invoice": agentInvoiceValidators,
  "zero-smart-report": smartReportValidators,
};

export function listValidatorCollections(dbName) {
  return (VALIDATORS_BY_DB[dbName] ?? []).map((v) => v.collection);
}
