import { parse } from "acorn";
import * as walk from "acorn-walk";

const CURSOR_CHAIN_OPS = new Set(["projection", "project", "sort", "limit", "skip"]);
const READ_OPS = new Set(["aggregate", "find", "findOne"]);
const FORBIDDEN_MEMBER_NAMES = new Set(["constructor", "__proto__", "prototype"]);

export const WRITE_OPS = new Set([
  "insert",
  "insertOne",
  "insertMany",
  "update",
  "updateOne",
  "updateMany",
  "delete",
  "deleteOne",
  "deleteMany",
  "drop",
  "dropIndex",
]);

const PARSE_OPTIONS = { ecmaVersion: 2022, sourceType: "script" };

/**
 * @param {import('acorn').Node} callee
 * @returns {string | null}
 */
export function getCalleePropertyName(callee) {
  if (callee?.type === "MemberExpression" && callee.property?.type === "Identifier") {
    return callee.property.name;
  }
  return null;
}

/**
 * @param {import('acorn').Node} callee
 * @returns {string | null}
 */
export function getCallExpressionName(callee) {
  if (callee?.type === "Identifier") {
    return callee.name;
  }
  return getCalleePropertyName(callee);
}

/**
 * @param {import('acorn').Node} node
 * @returns {import('acorn').Node | null}
 */
export function unwrapMongoReadExpression(node) {
  if (!node || node.type !== "CallExpression") {
    return null;
  }

  const calleeName = getCalleePropertyName(node.callee);
  if (calleeName === "toArray" && node.callee.object?.type === "CallExpression") {
    return unwrapMongoReadExpression(node.callee.object);
  }

  if (
    calleeName &&
    CURSOR_CHAIN_OPS.has(calleeName) &&
    node.callee.object?.type === "CallExpression"
  ) {
    return unwrapMongoReadExpression(node.callee.object);
  }

  if (calleeName && READ_OPS.has(calleeName)) {
    return node;
  }

  return null;
}

/**
 * Detects mongo-shell `db.collection` access without `db.getSiblingDB(...)`.
 *
 * @param {import('acorn').Node} node
 * @returns {boolean}
 */
export function isDirectDbCollectionAccess(node) {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    node.object.name === "db" &&
    (node.computed ||
      (node.property?.type === "Identifier" && node.property.name !== "getSiblingDB"))
  );
}

/**
 * @param {string} script
 * @returns {{ valid: boolean, errors: { line?: number, message: string, code?: string }[] }}
 */
export function validateScriptSource(script) {
  const errors = [];

  if (typeof script !== "string" || script.trim() === "") {
    return {
      valid: false,
      errors: [{ message: "Script must be a non-empty string", code: "VALIDATION_FAILED" }],
    };
  }

  let ast;
  try {
    ast = parse(script, PARSE_OPTIONS);
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          line: error.loc?.line,
          message: error.message,
          code: "VALIDATION_FAILED",
        },
      ],
    };
  }

  let hasReadPath = false;

  walk.simple(ast, {
    MemberExpression(node) {
      if (
        node.property?.type === "Identifier" &&
        FORBIDDEN_MEMBER_NAMES.has(node.property.name)
      ) {
        errors.push({
          line: node.loc?.start.line,
          message: `Access to .${node.property.name} is not allowed in report scripts.`,
          code: "VALIDATION_FAILED",
        });
      }
      if (isDirectDbCollectionAccess(node)) {
        const collectionName =
          node.property?.type === "Identifier" ? node.property.name : "collection";
        errors.push({
          line: node.loc?.start.line,
          message:
            `Use const targetDB = db.getSiblingDB("your_database_name"); then targetDB.${collectionName} instead of db.${collectionName}.`,
          code: "MISSING_GET_SIBLING_DB",
        });
      }
    },
    CallExpression(node) {
      const calleeName = getCallExpressionName(node.callee);
      if (calleeName === "withReport") {
        errors.push({
          line: node.loc?.start.line,
          message:
            "Script appears to be compiled output; paste Booster-style script only.",
          code: "ALREADY_COMPILED",
        });
        return;
      }
      if (calleeName && WRITE_OPS.has(calleeName)) {
        errors.push({
          line: node.loc?.start.line,
          message: `Write operation .${calleeName}() is not allowed in report scripts.`,
          code: "VALIDATION_FAILED",
        });
      }
      if (unwrapMongoReadExpression(node)) {
        hasReadPath = true;
      }
    },
  });

  if (!hasReadPath) {
    errors.push({
      message:
        "Script must include at least one read query (aggregate, find, or findOne).",
      code: "NO_READ_PATH",
    });
  }

  return { valid: errors.length === 0, errors };
}
