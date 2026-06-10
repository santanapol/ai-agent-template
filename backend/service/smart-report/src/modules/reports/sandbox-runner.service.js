import { Script, createContext } from "node:vm";
import { ObjectId } from "mongodb";
import { getReadClient } from "../../config/database-read.js";

const DEFAULT_TIMEOUT_MS = 30_000;

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

/** ครอบ collection ให้ aggregate/find/findOne คืนค่าเป็น Array หรือ Object ทันที (auto capture) */
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
  sandboxDb.getSiblingDB = makeSafeFunction((dbName) => createSiblingDb(client, dbName));
  return sandboxDb;
}


/**
 * รันสคริปต์ MongoDB shell-style (aggregate/find/findOne) ภายใต้ Node `vm` sandbox
 * โดยบังคับให้ query ทั้งหมดผ่าน Read-only connection (`MONGODB_URI_READ`)
 *
 * @param {object} options
 * @param {string} options.script - สคริปต์ JavaScript สไตล์ mongo shell
 * @param {Record<string, unknown>} [options.params] - dynamic parameters ที่ replace แล้ว
 * @param {number} [options.timeoutMs] - timeout สูงสุดของการรันสคริปต์ (ค่าเริ่มต้น 30 วินาที)
 * @returns {Promise<unknown>} ผลลัพธ์จาก expression สุดท้ายของสคริปต์ (Array/Object/primitive)
 */
export async function runReportScript({
  script,
  params = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (typeof script !== "string" || script.trim() === "") {
    throw new Error("[SandboxRunner] script must be a non-empty string");
  }

  const client = getReadClient();
  const context = createContext({
    ObjectId: createObjectId,
    ISODate: isoDate,
    db: createSandboxDb(client),
    params,
  });

  let result;
  try {
    const compiled = new Script(script, { filename: "report-script.js" });
    result = compiled.runInContext(context, { timeout: timeoutMs });
  } catch (error) {
    throw new Error(
      `[SandboxRunner] Script execution failed: ${error.message}`,
    );
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `[SandboxRunner] Script execution timed out after ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
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
