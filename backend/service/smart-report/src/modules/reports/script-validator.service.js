import { parse } from "acorn";
import * as walk from "acorn-walk";

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

  if (calleeName && ["aggregate", "find", "findOne"].includes(calleeName)) {
    return node;
  }

  return null;
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
