import { HttpError } from "../../lib/http-error.js";
import CODES from "../../lib/error-codes.js";
import { successEnvelope } from "../../lib/envelope.js";
import { readErrorCode } from "../../lib/error-code.js";
import { buildMeFromTrustedHeaders } from "./me.service.js";

export async function getMe(request, reply) {
  try {
    const data = buildMeFromTrustedHeaders(request.headers);
    return reply.status(200).send(successEnvelope(data));
  } catch (err) {
    const code = readErrorCode(err);
    if (code === "MISSING_GATEWAY_USER_CONTEXT") {
      throw new HttpError(
        403,
        CODES.MISSING_GATEWAY_USER_CONTEXT,
        "Required user context is missing",
      );
    }
    if (code === "INVALID_USER_CONTEXT") {
      throw new HttpError(
        403,
        CODES.INVALID_USER_CONTEXT,
        "User or tenant context is invalid",
      );
    }
    throw err;
  }
}
