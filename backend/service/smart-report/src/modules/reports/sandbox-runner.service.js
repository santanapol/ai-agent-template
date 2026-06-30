import { Script, createContext } from "node:vm";
import { ObjectId } from "mongodb";
import { getReadClient } from "../../config/database-read.js";

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

/** ครอบ collection — aggregate/find คืน Promise<array>; findOne คืน Promise<object|null> */
function wrapCollection(collection) {
  const wrapped = Object.create(null);
  wrapped.find = makeSafeFunction((query = {}, options = {}) =>
    collection.find(query, options).toArray(),
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
 * แปลงสคริปต์สไตล์ Booster (หลายบรรทัด + `.toArray()` แบบ sync) ให้รันใน Node sandbox ได้
 * โดย inject `await` ก่อน `.toArray()` และห่อด้วย async IIFE
 * @deprecated จะลบใน release 2 — ใช้ AST compiler + compiledScript แทน
 */
export function prepareBoosterStyleScript(script) {
  const trimmed = script.trim();
  if (/^\(\s*async\s+function/m.test(trimmed)) {
    return script;
  }

  const needsBoosterWrap =
    /\.\s*toArray\s*\(\s*\)/.test(script) || /\bresult\s*;\s*$/.test(trimmed);

  if (!needsBoosterWrap) {
    return script;
  }

  let transformed = script.replace(
    /(\b(?:const|let|var)\s+\w+\s*=\s*)([^;]*\.(?:aggregate|find)\([\s\S]*?\))\.toArray\(\)/g,
    (match, prefix, rhs) => {
      if (/\bawait\s+$/.test(prefix)) return match;
      return `${prefix}await ${rhs}`;
    },
  );

  transformed = transformed.replace(/(\bresult)\s*;\s*$/, "return $1;");

  const lines = transformed.split("\n");
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === "") lastIdx -= 1;
  if (lastIdx >= 0 && /^\s*(\w+)\s*;\s*$/.test(lines[lastIdx])) {
    lines[lastIdx] = lines[lastIdx].replace(/^\s*(\w+)\s*;\s*$/, "return $1;");
    transformed = lines.join("\n");
  }

  return `(async function () {\n${transformed}\n})()`;
}

/**
 * รันสคริปต์ MongoDB shell-style (aggregate/find/findOne) ภายใต้ Node `vm` sandbox
 * โดยบังคับให้ query ทั้งหมดผ่าน Read-only connection (`MONGODB_URI_READ`)
 *
 * @param {object} options
 * @param {string} options.script - สคริปต์ JavaScript สไตล์ mongo shell
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
    throw new Error("[SandboxRunner] script must be a non-empty string");
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

  const runnableScript = prepareBoosterStyleScript(script);

  let result;
  try {
    const compiled = new Script(runnableScript, {
      filename: "report-script.js",
    });
    result = compiled.runInContext(context, { timeout: resolvedTimeoutMs });
  } catch (error) {
    throw new Error(
      `[SandboxRunner] Script execution failed: ${error.message}`,
    );
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `[SandboxRunner] Script execution timed out after ${resolvedTimeoutMs}ms`,
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
          new Error(
            `[SandboxRunner] Script execution failed: ${error.message}`,
          ),
        );
      });
  });
}
