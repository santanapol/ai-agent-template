#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serviceRoot = join(__dirname, '..')
const standardsRoot = join(serviceRoot, '..', '..', '..', '_coding-standards', 'auth')

const openapiPath = join(serviceRoot, 'openapi.yaml')
const codesPath = join(standardsRoot, 'codes.yaml')

const openapiText = readFileSync(openapiPath, 'utf8')
const codesText = readFileSync(codesPath, 'utf8')

const parseCodes = (text) => {
  const lines = text.split('\n')
  const entries = new Map()

  for (let i = 0; i < lines.length; i += 1) {
    const codeMatch = lines[i].match(/^  ([A-Z0-9_]+):\s*$/)
    if (!codeMatch) continue

    const code = codeMatch[1]
    let httpStatus = null
    let deprecated = false

    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^  [A-Z0-9_]+:\s*$/.test(lines[j])) break
      if (/^version:/.test(lines[j])) break

      const statusMatch = lines[j].match(/^\s{4}httpStatus:\s*(\d+)\s*$/)
      if (statusMatch) httpStatus = Number(statusMatch[1])
      if (/^\s{4}deprecated:\s*true\s*$/i.test(lines[j])) deprecated = true
    }

    if (httpStatus === null) {
      throw new Error(`Missing httpStatus for code ${code} in ${codesPath}`)
    }

    entries.set(code, { httpStatus, deprecated })
  }

  return entries
}

const parseProblemEnum = (text) => {
  const lines = text.split('\n')
  const enumCodes = []

  const problemLine = lines.findIndex((line) => line.trim() === 'Problem:')
  if (problemLine < 0) throw new Error('components.schemas.Problem not found in openapi.yaml')

  let codeLine = -1
  for (let i = problemLine; i < lines.length; i += 1) {
    if (i > problemLine && /^\s{4}[A-Za-z]/.test(lines[i])) break
    if (lines[i].trim() === 'code:') {
      codeLine = i
      break
    }
  }
  if (codeLine < 0) throw new Error('Problem.code field not found in openapi.yaml')

  let enumLine = -1
  for (let i = codeLine; i < lines.length; i += 1) {
    if (lines[i].trim() === 'enum:') {
      enumLine = i
      break
    }
    if (i > codeLine && /^\s{4}[a-zA-Z]/.test(lines[i])) break
  }

  if (enumLine < 0) throw new Error('Problem.code enum is missing in openapi.yaml')

  for (let i = enumLine + 1; i < lines.length; i += 1) {
    const line = lines[i].trim()
    const itemMatch = line.match(/^-\s([A-Z0-9_]+)\s*$/)
    if (itemMatch) {
      enumCodes.push(itemMatch[1])
      continue
    }
    if (line.length > 0 && !line.startsWith('- ')) break
  }

  return enumCodes
}

const parseProblemExamples = (text) => {
  const lines = text.split('\n')
  const results = []

  for (let i = 0; i < lines.length; i += 1) {
    const codeMatch = lines[i].match(/^\s+code:\s*([A-Z0-9_]+)\s*$/)
    if (!codeMatch) continue

    let status = null
    for (let j = i - 1; j >= Math.max(0, i - 12); j -= 1) {
      const statusMatch = lines[j].match(/^\s+status:\s*(\d+)\s*$/)
      if (statusMatch) {
        status = Number(statusMatch[1])
        break
      }
    }

    results.push({
      line: i + 1,
      code: codeMatch[1],
      status
    })
  }

  return results
}

const codes = parseCodes(codesText)
const activeCodes = [...codes.entries()]
  .filter(([, meta]) => !meta.deprecated)
  .map(([code]) => code)
const codeEnum = parseProblemEnum(openapiText)
const problemExamples = parseProblemExamples(openapiText)

const failures = []

for (const enumCode of codeEnum) {
  if (!codes.has(enumCode)) {
    failures.push(`Problem.code enum includes unknown code: ${enumCode}`)
    continue
  }
  if (codes.get(enumCode).deprecated) {
    failures.push(`Problem.code enum must not include deprecated code: ${enumCode}`)
  }
}

for (const active of activeCodes) {
  if (!codeEnum.includes(active)) {
    failures.push(`Problem.code enum is missing active code: ${active}`)
  }
}

for (const sample of problemExamples) {
  const meta = codes.get(sample.code)
  if (!meta) {
    failures.push(`Unknown code at openapi.yaml:${sample.line} -> ${sample.code}`)
    continue
  }
  if (meta.deprecated) {
    failures.push(`Deprecated code used at openapi.yaml:${sample.line} -> ${sample.code}`)
  }
  if (sample.status === null) {
    failures.push(`Missing nearby status for code at openapi.yaml:${sample.line} -> ${sample.code}`)
    continue
  }
  if (sample.status !== meta.httpStatus) {
    failures.push(
      `Status mismatch at openapi.yaml:${sample.line} -> ${sample.code} expected ${meta.httpStatus}, got ${sample.status}`
    )
  }
}

if (failures.length > 0) {
  console.error('OpenAPI Problem.code validation failed:\n')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('OpenAPI Problem.code validation passed')
