import http from "node:http";
import { ObjectId } from "mongodb";

const USER_ID_PATTERN =
  /^\/internal\/users\/([a-fA-F0-9]{24})\/sessions\/revoke$/;
const PASSWORD_PATTERN = /^\/internal\/users\/([a-fA-F0-9]{24})\/password$/;

/**
 * Minimal auth internal stub for integration tests.
 * @param {object} options
 * @param {() => import('mongodb').Db} options.getDatabase
 * @param {string} options.serviceSecret
 * @param {string} [options.defaultRole]
 * @param {string} options.actorUserId
 * @param {'success'|'fail'} [options.revokeBehavior]
 * @param {'success'|'fail'} [options.passwordBehavior]
 */
export async function startMockAuthInternalServer(options) {
  const defaultRole = options.defaultRole ?? "staff";
  const revokeBehavior = options.revokeBehavior ?? "success";
  const passwordBehavior = options.passwordBehavior ?? "success";
  /** @type {{ password?: string, revoke_sessions?: boolean } | null} */
  let lastPasswordRequest = null;

  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });

  async function handleRequest(req, res) {
    const authHeader = req.headers.authorization ?? "";
    if (authHeader !== `Bearer ${options.serviceSecret}`) {
      res.writeHead(401, { "content-type": "application/problem+json" });
      res.end(
        JSON.stringify({
          status: 401,
          code: "AUTH_INTERNAL_UNAUTHORIZED",
          title: "Unauthorized",
        }),
      );
      return;
    }

    const passwordMatch = req.url?.match(PASSWORD_PATTERN);
    if (req.method === "POST" && passwordMatch) {
      const body = await readJsonBody(req);
      lastPasswordRequest = {
        password: body.password,
        revoke_sessions: body.revoke_sessions,
      };

      if (passwordBehavior === "fail") {
        res.writeHead(503, { "content-type": "application/problem+json" });
        res.end(
          JSON.stringify({
            status: 503,
            code: "AUTH_NOT_READY",
            detail: "Password service unavailable",
          }),
        );
        return;
      }

      res.writeHead(204);
      res.end();
      return;
    }

    const roleMatch = req.url?.match(
      /^\/internal\/users\/([a-fA-F0-9]{24})\/role$/,
    );
    if (req.method === "PATCH" && roleMatch) {
      res.writeHead(204);
      res.end();
      return;
    }

    const revokeMatch = req.url?.match(USER_ID_PATTERN);
    if (req.method === "POST" && revokeMatch) {
      if (revokeBehavior === "fail") {
        res.writeHead(503, { "content-type": "application/problem+json" });
        res.end(
          JSON.stringify({
            status: 503,
            code: "AUTH_NOT_READY",
            detail: "Revoke unavailable",
          }),
        );
        return;
      }

      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/internal/users") {
      await handleProvision(req, res);
      return;
    }

    res.writeHead(404, { "content-type": "application/problem+json" });
    res.end(
      JSON.stringify({
        status: 404,
        code: "AUTH_USER_NOT_FOUND",
        title: "Not Found",
      }),
    );
  }

  async function handleProvision(req, res) {
    const body = await readJsonBody(req);
    const username =
      typeof body.username === "string" ? body.username.toLowerCase() : "";

    if (!username || typeof body.password !== "string") {
      res.writeHead(400, { "content-type": "application/problem+json" });
      res.end(
        JSON.stringify({
          status: 400,
          code: "AUTH_INVALID_REQUEST",
          detail: "username and password are required",
        }),
      );
      return;
    }

    const users = options.getDatabase().collection("auth_users");
    const existing = await users.findOne({ username });
    if (existing) {
      res.writeHead(409, { "content-type": "application/problem+json" });
      res.end(
        JSON.stringify({
          status: 409,
          code: "DUPLICATE",
          detail: "Username already exists",
        }),
      );
      return;
    }

    const now = new Date();
    const userId = new ObjectId();
    await users.insertOne({
      _id: userId,
      ou_id: new ObjectId(body.ou_id),
      branch_id: new ObjectId(body.branch_id),
      username,
      password_hash: "mock-hash",
      role: body.role ?? defaultRole,
      cr_by: options.actorUserId,
      cr_date: now,
      cr_prog: "mock-auth-internal",
      upd_by: options.actorUserId,
      upd_date: now,
      upd_prog: "mock-auth-internal",
    });

    res.writeHead(201, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: userId.toString() }));
  }

  await new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind mock auth server");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    getLastPasswordRequest: () => lastPasswordRequest,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

/**
 * @param {import('node:http').IncomingMessage} req
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
