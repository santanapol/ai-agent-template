import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('route config files', () => {
  test('routes.example.json matches routes.json', () => {
    const routes = JSON.parse(readFileSync(join(root, 'routes.json'), 'utf8'))
    const example = JSON.parse(readFileSync(join(root, 'routes.example.json'), 'utf8'))
    assert.deepStrictEqual(example, routes)
  })
})
