import { Script, createContext } from "node:vm";
import { ObjectId } from "mongodb";
import { getReadClient } from "../../config/database-read.js";
import {
  SandboxRunnerError,
  SANDBOX_ERROR_CODES,
} from "./sandbox-runner.errors.js";

export { SandboxRunnerError, SANDBOX_ERROR_CODES } from "./sandbox-runner.errors.js";

const DEFAULT_REPORT_SCRIPT_TIMEOUT_MS = 120_000;

/**
 * @param {number | undefined} [overrideMs]
 * @returns {number}
 */
export function resolveReportScriptTimeoutMs(overrideMs) {
  if (overrideMs !== undefined) {
    return overrideMs;
  }
  const parsed = Number(process.env.REPORT_SCRIPT_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_REPORT_SCRIPT_TIMEOUT_MS;
}

function makeSafeFunction(fn) {
  Object.setPrototypeOf(fn, null);
  if (fn.prototype) fn.prototype = null;
  return fn;
}

const isoDate = makeSafeFunction(function isoDate(value) {
  return new Date(value);
});

/** เลียนแบบ `ObjectId(...)` ของ mongo shell ที่เรียกได้ทั้งแบบมีและไม่มี `new` */
const createObjectId = makeSafeFunction(function createObjectId(value) {
  return new ObjectId(value);
});

/** Sandbox helper สำหรับ compiled script — ไม่ชนกับ scheduler.runReport() */
const withReport = makeSafeFunction(function withReport(fn) {
  return fn();
});

/** ครอบ collection — aggregate คืน Promise<array>; find คืน cursor chain ที่ await ได้ */
function createFindCursor(collection, query = {}, options = {}) {
  let cursor = collection.find(query, options);
  const chain = Object.create(null);

  const chainOp = (mutator) =>
    makeSafeFunction((arg) => {
      cursor = mutator(cursor, arg);
      return chain;
    });

  chain.projection = chainOp((current, projection) => current.project(projection));
  chain.project = chain.projection;
  chain.sort = chainOp((current, sort) => current.sort(sort));
  chain.limit = chainOp((current, limit) => current.limit(limit));
  chain.skip = chainOp((current, skip) => current.skip(skip));
  chain.toArray = makeSafeFunction(() => cursor.toArray());
  chain.then = makeSafeFunction((resolve, reject) =>
    cursor.toArray().then(resolve, reject),
  );
  chain.catch = makeSafeFunction((reject) => cursor.toArray().catch(reject));

  return chain;
}

function wrapCollection(collection) {
  const wrapped = Object.create(null);
  wrapped.find = makeSafeFunction((query = {}, options = {}) =>
    createFindCursor(collection, query, options),
  );
  wrapped.aggregate = makeSafeFunction((pipeline = [], options = {}) =>
    collection.aggregate(pipeline, options).toArray(),
  );
  wrapped.findOne = makeSafeFunction((query = {}, options = {}) =>
    collection.findOne(query, options),
  );
  return wrapped;
}

/** เลียนแบบ `db.getSiblingDB(name).<collection>` ของ mongo shell ด้วย Proxy แบบ dynamic property */
function createSiblingDb(client, dbName) {
  const targetDb = client.db(dbName);
  return new Proxy(Object.create(null), {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return wrapCollection(targetDb.collection(prop));
    },
  });
}

function createSandboxDb(client) {
  const sandboxDb = Object.create(null);
  sandboxDb.getSiblingDB = makeSafeFunction((dbName) =>
    createSiblingDb(client, dbName),
  );
  return sandboxDb;
}

/**
 * รันสคริปต์ MongoDB shell-style ภายใต้ Node `vm` sandbox
 * โดยบังคับให้ query ทั้งหมดผ่าน Read-only connection (`MONGODB_URI_READ`)
 *
 * @param {object} options
 * @param {string} options.script - compiled script (`withReport(async () => { ... })`)
 * @param {Record<string, unknown>} [options.params] - dynamic parameters ที่ inject เข้า sandbox context โดยตรง (เข้าถึงได้ผ่าน `params.*` ในสคริปต์)
 * @param {number} [options.timeoutMs] - timeout สูงสุดของการรันสคริปต์ (ค่าเริ่มต้นจาก REPORT_SCRIPT_TIMEOUT_MS หรือ 120s)
 * @returns {Promise<unknown>} ผลลัพธ์จาก expression สุดท้ายของสคริปต์ (Array/Object/primitive)
 */
export async function runReportScript({
  script,
  params = {},
  timeoutMs,
}) {
  if (typeof script !== "string" || script.trim() === "") {
    throw new SandboxRunnerError(
      SANDBOX_ERROR_CODES.INVALID_SCRIPT,
      "script must be a non-empty string",
    );
  }

  const resolvedTimeoutMs = resolveReportScriptTimeoutMs(timeoutMs);
  const client = getReadClient();
  const context = createContext({
    ObjectId: createObjectId,
    ISODate: isoDate,
    withReport,
    db: createSandboxDb(client),
    params,
  });

  let result;
  try {
    const compiled = new Script(script, {
      filename: "report-script.js",
    });
    result = compiled.runInContext(context, { timeout: resolvedTimeoutMs });
  } catch (error) {
    throw new SandboxRunnerError(
      SANDBOX_ERROR_CODES.EXECUTION_FAILED,
      `Script execution failed: ${error.message}`,
    );
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new SandboxRunnerError(
          SANDBOX_ERROR_CODES.TIMEOUT,
          `Script execution timed out after ${resolvedTimeoutMs}ms`,
        ),
      );
    }, resolvedTimeoutMs);
    if (typeof timer.unref === "function") timer.unref();

    Promise.resolve(result)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(
          new SandboxRunnerError(
            SANDBOX_ERROR_CODES.EXECUTION_FAILED,
            `Script execution failed: ${error.message}`,
          ),
        );
      });
  });
}
