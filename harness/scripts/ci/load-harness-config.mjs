#!/usr/bin/env node
/**
 * Load harness.config.yaml — shared by docs-lint and agent docs.
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULTS = {
  version: 1,
  layout: 'code-base',
  code: {
    backend: 'code-base/backend',
    frontend: 'code-base/frontend',
  },
};

function stripComment(value) {
  const i = value.indexOf('#');
  return (i === -1 ? value : value.slice(0, i)).trim();
}

function parseHarnessConfig(text) {
  const layout = stripComment(text.match(/^layout:\s*(.+)$/m)?.[1] ?? DEFAULTS.layout);
  const backend = stripComment(text.match(/^\s+backend:\s*(.+)$/m)?.[1] ?? DEFAULTS.code.backend);
  const frontend = stripComment(text.match(/^\s+frontend:\s*(.+)$/m)?.[1] ?? DEFAULTS.code.frontend);

  if (!['code-base', 'root'].includes(layout)) {
    throw new Error(`Invalid harness.config.yaml layout: ${layout} (use code-base or root)`);
  }

  return {
    version: 1,
    layout,
    code: { backend, frontend },
  };
}

/**
 * @param {string} root - repository root (absolute)
 */
export function loadHarnessConfig(root) {
  const configPath = path.join(root, 'harness.config.yaml');
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULTS, code: { ...DEFAULTS.code } };
  }
  return parseHarnessConfig(fs.readFileSync(configPath, 'utf8'));
}

export { DEFAULTS };
