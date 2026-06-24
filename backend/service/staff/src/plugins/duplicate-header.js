import fp from "fastify-plugin";
import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

const CRITICAL_HEADERS = new Set([
  "x-gateway-secret",
  "x-request-id",
  "x-user-id",
  "x-user-ou",
  "x-user-branch",
  "x-user-role",
  "x-user-permissions",
  "content-type",
  "if-match",
]);

function countHeaderOccurrences(rawHeaders) {
  const countMap = new Map();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const key = String(rawHeaders[index] || "").toLowerCase();
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }
  return countMap;
}

export default fp(async function duplicateHeaderGuard(fastify) {
  fastify.addHook("onRequest", async (request, _reply) => {
    const counts = countHeaderOccurrences(request.raw.rawHeaders || []);
    for (const headerName of CRITICAL_HEADERS) {
      if ((counts.get(headerName) || 0) > 1) {
        if (headerName === "x-gateway-secret") {
          throw new HttpError(
            401,
            CODES.GATEWAY_SECRET_REJECTED,
            "Authentication failed",
          );
        }
        throw new HttpError(
          400,
          CODES.INVALID_HEADER,
          `Invalid header: ${headerName}`,
        );
      }
    }
  });
});
