#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { VALID_ROLES } from '@zero-platform/roles'

const __dirname = dirname(fileURLToPath(import.meta.url))
const openapiPath = join(__dirname, '..', 'openapi.yaml')
const openapiText = readFileSync(openapiPath, 'utf8')

/** @param {string} schemaName */
function extractRoleEnum(schemaName) {
  const blockRe = new RegExp(
    `${schemaName}:[\\s\\S]*?properties:\\s*\\n\\s*role:\\s*\\n\\s*type:\\s*string\\s*\\n\\s*enum:\\s*\\[([^\\]]+)\\]`,
    'm'
  )
  const match = openapiText.match(blockRe)
  if (!match) {
    throw new Error(`Could not find role enum for ${schemaName} in openapi.yaml`)
  }
  return match[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

const setRoleEnum = extractRoleEnum('InternalSetRoleRequest')
const canonical = [...VALID_ROLES].sort()
const fromOpenApi = [...setRoleEnum].sort()

if (
  canonical.length !== fromOpenApi.length ||
  canonical.some((role, i) => role !== fromOpenApi[i])
) {
  console.error('OpenAPI InternalSetRoleRequest.role enum drift from @zero-platform/roles')
  console.error('  package:', canonical.join(', '))
  console.error('  openapi:', fromOpenApi.join(', '))
  process.exit(1)
}

console.log('auth openapi role enum matches @zero-platform/roles')
