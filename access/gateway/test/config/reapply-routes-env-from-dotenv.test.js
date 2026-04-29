import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reapplyRoutesEnvFromDotenvFile } from '../../src/config/reapply-routes-env-from-dotenv.js'

describe('reapplyRoutesEnvFromDotenvFile', () => {
  const originalCwd = process.cwd()
  let tmp
  /** @type {string | undefined} */
  let savedJson
  /** @type {string | undefined} */
  let savedFile

  beforeEach(() => {
    savedJson = process.env.ROUTES_JSON
    savedFile = process.env.ROUTES_FILE
    delete process.env.ROUTES_JSON
    delete process.env.ROUTES_FILE
    tmp = mkdtempSync(join(tmpdir(), 'gw-routes-'))
    process.chdir(tmp)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tmp, { recursive: true, force: true })
    if (savedJson !== undefined) process.env.ROUTES_JSON = savedJson
    else delete process.env.ROUTES_JSON
    if (savedFile !== undefined) process.env.ROUTES_FILE = savedFile
    else delete process.env.ROUTES_FILE
  })

  test('overrides shell ROUTES_JSON with value from .env', () => {
    process.env.ROUTES_JSON = JSON.stringify([
      { prefix: '/api', upstream: 'http://127.0.0.1:3003', stripPrefix: false }
    ])
    const fromFile = JSON.stringify([
      { prefix: '/api/v1/reports', upstream: 'http://127.0.0.1:3000', stripPrefix: false },
      { prefix: '/api/v1/items', upstream: 'http://127.0.0.1:3003', stripPrefix: false },
      { prefix: '/api', upstream: 'http://127.0.0.1:3003', stripPrefix: false }
    ])
    writeFileSync(join(tmp, '.env'), `ROUTES_JSON=${fromFile}\n`, 'utf8')

    expect(reapplyRoutesEnvFromDotenvFile({ envPath: join(tmp, '.env') })).toEqual({
      kind: 'ROUTES_JSON'
    })
    expect(process.env.ROUTES_JSON).toBe(fromFile)
    expect(process.env.ROUTES_FILE).toBeUndefined()
  })

  test('sets ROUTES_FILE and clears ROUTES_JSON when .env uses ROUTES_FILE only', () => {
    process.env.ROUTES_JSON = '[]'
    writeFileSync(join(tmp, '.env'), 'ROUTES_FILE=./routes.example.json\n', 'utf8')

    expect(reapplyRoutesEnvFromDotenvFile({ envPath: join(tmp, '.env') })).toEqual({
      kind: 'ROUTES_FILE'
    })
    expect(process.env.ROUTES_FILE).toBe('./routes.example.json')
    expect(process.env.ROUTES_JSON).toBeUndefined()
  })
})
