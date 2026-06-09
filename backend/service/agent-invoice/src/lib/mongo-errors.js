export const DATASTORE_ACCESS_MESSAGE =
  "Database access denied for this operation. Check MongoDB user privileges on zero-agent-invoice (MONGODB_DB_INVOICE).";

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isMongoUnauthorized(err) {
  if (!err || typeof err !== "object") return false;
  const e = /** @type {{ code?: number, codeName?: string }} */ (err);
  return e.code === 13 || e.codeName === "Unauthorized";
}

/**
 * Maps MongoDB auth failures to API envelope (see coding-standard 6-api-response-codes).
 * @param {unknown} err
 * @returns {{ statusCode: number, code: string, message: string } | null}
 */
export function toDatastoreHttpError(err) {
  if (!isMongoUnauthorized(err)) return null;
  return {
    statusCode: 500,
    code: "DATASTORE_CREDENTIAL_REJECTED",
    message: DATASTORE_ACCESS_MESSAGE,
  };
}
