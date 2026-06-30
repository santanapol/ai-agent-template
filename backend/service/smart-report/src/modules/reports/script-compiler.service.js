import { parse } from "acorn";
import * as walk from "acorn-walk";
import {
  getCalleePropertyName,
  unwrapMongoReadExpression,
  validateScriptSource,
} from "./script-validator.service.js";

const PARSE_OPTIONS = { ecmaVersion: 2022, sourceType: "script", locations: true };

/**
 * @param {string} source
 * @param {{ start: number, end: number, replacement: string }[]} patches
 * @returns {string}
 */
function applyPatches(source, patches) {
  const sorted = [...patches].sort((a, b) => b.start - a.start);
  let result = source;
  for (const patch of sorted) {
    result =
      result.slice(0, patch.start) + patch.replacement + result.slice(patch.end);
  }
  return result;
}

/**
 * @param {import('acorn').Program} ast
 * @returns {import('acorn').Statement | null}
 */
function getLastMeaningfulStatement(ast) {
  for (let i = ast.body.length - 1; i >= 0; i -= 1) {
    const statement = ast.body[i];
    if (statement.type === "EmptyStatement") continue;
    return statement;
  }
  return null;
}

/**
 * @param {string} source
 * @returns {string}
 */
export function transformScriptBody(source) {
  const ast = parse(source, PARSE_OPTIONS);
  /** @type {{ start: number, end: number, replacement: string }[]} */
  const patches = [];

  walk.simple(ast, {
    VariableDeclarator(node) {
      if (!node.init) return;

      const mongoExpr = unwrapMongoReadExpression(node.init);
      if (!mongoExpr) return;

      if (node.init.type === "AwaitExpression") return;

      if (
        node.init.type === "CallExpression" &&
        getCalleePropertyName(node.init.callee) === "toArray"
      ) {
        patches.push({
          start: node.init.start,
          end: node.init.end,
          replacement: `await ${source.slice(mongoExpr.start, mongoExpr.end)}`,
        });
        return;
      }

      patches.push({
        start: node.init.start,
        end: node.init.start,
        replacement: "await ",
      });
    },
  });

  const lastStatement = getLastMeaningfulStatement(ast);
  if (lastStatement?.type === "ExpressionStatement") {
    const { expression } = lastStatement;
    const mongoExpr = unwrapMongoReadExpression(expression);

    if (mongoExpr) {
      const exprSource =
        expression.type === "CallExpression" &&
        getCalleePropertyName(expression.callee) === "toArray"
          ? source.slice(mongoExpr.start, mongoExpr.end)
          : source.slice(expression.start, expression.end);
      patches.push({
        start: lastStatement.start,
        end: lastStatement.end,
        replacement: `return await ${exprSource};`,
      });
    } else if (expression.type === "Identifier") {
      patches.push({
        start: lastStatement.start,
        end: lastStatement.end,
        replacement: `return ${expression.name};`,
      });
    }
  }

  return applyPatches(source, patches).trim();
}

/**
 * @param {string} script
 * @returns {{
 *   success: boolean,
 *   compiledScript: string | null,
 *   errors: { line?: number, message: string, code?: string }[]
 * }}
 */
export function compileBoosterScript(script) {
  const validation = validateScriptSource(script);
  if (!validation.valid) {
    return { success: false, compiledScript: null, errors: validation.errors };
  }

  try {
    const body = transformScriptBody(script);
    const compiledScript = `withReport(async () => {\n${body}\n});`;
    return { success: true, compiledScript, errors: [] };
  } catch (error) {
    return {
      success: false,
      compiledScript: null,
      errors: [
        {
          line: error.loc?.line,
          message: error.message,
          code: "VALIDATION_FAILED",
        },
      ],
    };
  }
}
