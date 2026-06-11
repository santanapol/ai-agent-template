import fp from "fastify-plugin";

import { HttpError } from "../lib/http-error.js";
import CODES from "../lib/error-codes.js";

const CRITICAL_HEADERS = new Set([
  "x-gateway-secret",
  "x-user-ou",
  "x-user-branch",
  "x-user-id",
  "x-user-role",
  "x-request-id",
  "if-match",
]);

function countHeaderOccurrences(rawHeaders) {
  const counts = new Map();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const key = String(rawHeaders[index] || "").toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export default fp(async function duplicateHeaderGuard(fastify) {
  fastify.addHook("onRequest", async (request) => {
    const counts = countHeaderOccurrences(request.raw.rawHeaders || []);
    for (const header of CRITICAL_HEADERS) {
      if ((counts.get(header) || 0) > 1) {
        throw new HttpError(
          400,
          CODES.INVALID_HEADER,
          `Duplicate header detected: ${header}`,
        );
      }
    }
  });
});
