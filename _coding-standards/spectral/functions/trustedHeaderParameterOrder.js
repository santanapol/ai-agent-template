'use strict';

/**
 * Enforces canonical header order for internal API behind gateway (see
 * _coding-standards/backend/api.md → Canonical trusted header order).
 * Only parameters with in: header whose names appear in ORDER are checked;
 * their relative order in each `parameters` array must match ORDER (subset allowed).
 */
const ORDER = [
  'x-user-ou',
  'x-user-branch',
  'x-user-id',
  'x-user-role',
  'if-match',
  'x-request-id',
];

const HTTP_VERBS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
]);

function resolveRef(root, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) {
    return null;
  }
  const parts = ref.slice(2).split('/');
  let node = root;
  for (const raw of parts) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (node == null || typeof node !== 'object') {
      return null;
    }
    node = node[key];
  }
  return node;
}

function resolvedParam(param, root) {
  if (param && typeof param === 'object' && typeof param.$ref === 'string') {
    return resolveRef(root, param.$ref);
  }
  return param;
}

function headerCanonicalName(param, root) {
  const p = resolvedParam(param, root);
  if (!p || p.in !== 'header' || typeof p.name !== 'string') {
    return null;
  }
  return p.name.toLowerCase();
}

function validateParametersArray(params, root, instancePath) {
  if (!Array.isArray(params)) {
    return [];
  }
  const errors = [];
  let lastOrderIdx = -1;
  for (let i = 0; i < params.length; i += 1) {
    const name = headerCanonicalName(params[i], root);
    if (!name) {
      continue;
    }
    const idx = ORDER.indexOf(name);
    if (idx === -1) {
      continue;
    }
    if (idx < lastOrderIdx) {
      errors.push({
        message: `Header parameters out of order: expected ${ORDER.join(' → ')} (omit unused; do not reorder present headers). Problem at index ${i} ("${name}").`,
        path: [...instancePath, i],
      });
      return errors;
    }
    lastOrderIdx = idx;
  }
  return errors;
}

function walkPaths(root) {
  const errors = [];
  if (!root || typeof root !== 'object' || !root.paths || typeof root.paths !== 'object') {
    return errors;
  }
  for (const [pathKey, pathItem] of Object.entries(root.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    if (Array.isArray(pathItem.parameters)) {
      errors.push(
        ...validateParametersArray(pathItem.parameters, root, ['paths', pathKey, 'parameters']),
      );
    }
    for (const [key, op] of Object.entries(pathItem)) {
      if (!HTTP_VERBS.has(key) || !op || typeof op !== 'object') {
        continue;
      }
      if (Array.isArray(op.parameters)) {
        errors.push(
          ...validateParametersArray(op.parameters, root, ['paths', pathKey, key, 'parameters']),
        );
      }
    }
  }
  return errors;
}

module.exports = (targetVal) => walkPaths(targetVal);
