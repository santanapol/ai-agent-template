import { requirePermission } from "../../lib/require-permission.js";
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

async function agentInvoiceRoutes(fastify) {
  fastify.post(
    "/api/v1/invoices/generate",
    {
      schema: { body: generateBodySchema },
      preHandler: requirePermission("invoices:write"),
    },
    postGenerate,
  );

  fastify.post(
    "/api/v1/invoices/calculate-fee",
    {
      schema: { body: calculateFeeBodySchema },
      preHandler: requirePermission("invoices:write"),
    },
    postCalculateFee,
  );

  fastify.get(
    "/api/v1/invoices",
    {
      schema: { querystring: listInvoicesQuerySchema },
      preHandler: requirePermission("invoices:list"),
    },
    getInvoiceList,
  );

  fastify.get(
    "/api/v1/invoices/agent",
    { preHandler: requirePermission("invoices:list") },
    getInvoiceAgents,
  );

  fastify.get(
    "/api/v1/invoices/:id/transactions",
    {
      schema: { params: getDetailParamsSchema },
      preHandler: requirePermission("invoices:read"),
    },
    getInvoiceTransactions,
  );

  fastify.put(
    "/api/v1/invoices/:id/status",
    {
      schema: {
        params: getDetailParamsSchema,
        body: updateStatusBodySchema,
      },
      preHandler: requirePermission("invoices:write"),
    },
    putInvoiceStatus,
  );

  fastify.get(
    "/api/v1/invoices/:id",
    {
      schema: { params: getDetailParamsSchema },
      preHandler: requirePermission("invoices:read"),
    },
    getAgentInvoiceDetail,
  );
}

export default agentInvoiceRoutes;
