import Fastify from "fastify";

import {
  registerErrorHandler,
  registerNotFoundHandler,
} from "./lib/error-handler.js";
import { resolveGatewaySecret } from "./lib/resolve-gateway-secret.js";
import duplicateHeaderGuard from "./plugins/duplicate-header-guard.js";
import gatewayAuth from "./plugins/gateway-auth.js";
import requestId from "./plugins/request-id.js";
import userContext from "./plugins/user-context.js";
import { registerInviteLinksRoutes } from "./modules/invite-links/invite-links.route.js";
import { registerReferringMembersRoutes } from "./modules/referring-members/referring-members.route.js";
import { registerRoyalty21TimesRoutes } from "./modules/royalty-21-times/royalty-21-times.route.js";
import { registerHealthRoutes } from "./routes/health.route.js";
import { registerBasicMetrics } from "../../../shared/fastify-metrics/basic-metrics.js";

const PUBLIC_PATHS = ["/healthz", "/readyz", "/metrics"];

/**
 * @param {import('fastify').FastifyServerOptions & {
 *   gatewaySecret?: string;
 *   getDb?: () => import('mongodb').Db;
 * }} [options]
 */
export async function buildApp(options = {}) {
  const startedAtMs = Date.now();
  const app = Fastify({
    logger: options.logger ?? true,
    ...options,
  });

  const gatewaySecret = resolveGatewaySecret(options);

  await app.register(requestId);
  await app.register(duplicateHeaderGuard);
  await app.register(gatewayAuth, {
    secret: gatewaySecret,
    skipPaths: PUBLIC_PATHS,
  });
  await app.register(userContext, {
    skipPaths: PUBLIC_PATHS,
    requireBranch: true,
  });

  await registerHealthRoutes(app);
  registerBasicMetrics(app, { startedAtMs, serviceName: "branch-report" });
  await registerInviteLinksRoutes(app, { getDb: options.getDb });
  await registerReferringMembersRoutes(app, { getDb: options.getDb });
  await registerRoyalty21TimesRoutes(app, { getDb: options.getDb });

  if (options.registerProbeRoute) {
    app.get(
      "/api/v1/branch-report/_probe",
      {
        schema: {
          querystring: {
            type: "object",
            properties: {
              page: { type: "integer", minimum: 1 },
            },
          },
        },
      },
      async (request, reply) => {
        const { sendSuccess } = await import("./lib/response.js");
        return sendSuccess(reply, {
          data: { service: "branch-report" },
          requestId: request.requestId,
        });
      },
    );
  }

  registerErrorHandler(app);
  registerNotFoundHandler(app);

  return app;
}

export { PUBLIC_PATHS };
