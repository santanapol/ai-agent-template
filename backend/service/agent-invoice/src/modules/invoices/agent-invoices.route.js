import { isValidObjectId } from "../../lib/object-id.js";
import { resolveRequestId } from "../../lib/request-id.js";
import { sendError } from "../../lib/response.js";
import {
  getAgentInvoiceDetail,
  getInvoiceAgents,
  getInvoiceList,
  getInvoiceTransactions,
  postCalculateFee,
  postGenerate,
  putInvoiceStatus,
} from "./agent-invoices.controller.js";
import {
  calculateFeeBodySchema,
  generateBodySchema,
  getDetailParamsSchema,
  listInvoicesQuerySchema,
  updateStatusBodySchema,
} from "./agent-invoices.schema.js";

const OBJECT_ID_HEADERS = ["x-user-ou", "x-user-branch"];

async function agentInvoiceRoutes(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    const requestId = resolveRequestId(request.headers["x-request-id"]);

    const userId = request.headers["x-user-id"];
    const userOu = request.headers["x-user-ou"];
    const userBranch = request.headers["x-user-branch"];
    const userRole = request.headers["x-user-role"];

    if (!userId || !userOu || !userBranch || !userRole) {
      return sendError(reply, {
        statusCode: 403,
        code: "MISSING_GATEWAY_USER_CONTEXT",
        message: "Required user context is missing",
        requestId,
      });
    }

    for (const header of OBJECT_ID_HEADERS) {
      const value = request.headers[header];
      if (!isValidObjectId(String(value))) {
        return sendError(reply, {
          statusCode: 403,
          code: "INVALID_USER_CONTEXT",
          message: "Invalid user context",
          requestId,
        });
      }
    }

    request.userContext = {
      id: userId,
      ouId: userOu,
      branchId: userBranch,
      role: userRole,
    };
  });

  fastify.post(
    "/api/v1/invoices/generate",
    { schema: { body: generateBodySchema } },
    postGenerate,
  );

  fastify.post(
    "/api/v1/invoices/calculate-fee",
    { schema: { body: calculateFeeBodySchema } },
    postCalculateFee,
  );

  fastify.get(
    "/api/v1/invoices",
    { schema: { querystring: listInvoicesQuerySchema } },
    getInvoiceList,
  );

  fastify.get("/api/v1/invoices/agent", getInvoiceAgents);

  fastify.get(
    "/api/v1/invoices/:id/transactions",
    { schema: { params: getDetailParamsSchema } },
    getInvoiceTransactions,
  );

  fastify.put(
    "/api/v1/invoices/:id/status",
    {
      schema: {
        params: getDetailParamsSchema,
        body: updateStatusBodySchema,
      },
    },
    putInvoiceStatus,
  );

  fastify.get(
    "/api/v1/invoices/:id",
    { schema: { params: getDetailParamsSchema } },
    getAgentInvoiceDetail,
  );
}

export default agentInvoiceRoutes;
