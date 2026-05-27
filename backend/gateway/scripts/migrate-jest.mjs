import fs from 'fs'
import path from 'path'

const dir = './test'

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  if (content.includes('node:test')) return // Already processed

  let hasNodeTest = false
  let hasAssert = false

  if (
    content.includes('describe(') ||
    content.includes('it(') ||
    content.includes('test(') ||
    content.includes('beforeEach(') ||
    content.includes('afterEach(') ||
    content.includes('beforeAll(') ||
    content.includes('afterAll(')
  ) {
    hasNodeTest = true
  }

  if (content.includes('expect(')) {
    hasAssert = true
  }

  // Match `expect(a).resolves.to...`
  // Too complex for simple regex, leave them as expect and fix manually if any, or just catch `resolves.toBe`
  content = content.replace(
    /await expect\((.*?)\)\.resolves\.toEqual\((.*?)\)/g,
    'assert.deepStrictEqual(await $1, $2)'
  )
  content = content.replace(
    /await expect\((.*?)\)\.resolves\.toBe\((.*?)\)/g,
    'assert.strictEqual(await $1, $2)'
  )
  content = content.replace(
    /await expect\((.*?)\)\.rejects\.toThrow\((.*?)\)/g,
    'await assert.rejects($1, $2)'
  )

  // expect(a).toBe(b) -> assert.strictEqual(a, b)
  content = content.replace(/expect\((.*?)\)\.toBe\((.*?)\)/g, 'assert.strictEqual($1, $2)')
  // expect(a).toEqual(b) -> assert.deepStrictEqual(a, b)
  content = content.replace(/expect\((.*?)\)\.toEqual\((.*?)\)/g, 'assert.deepStrictEqual($1, $2)')
  // expect(a).toBeUndefined() -> assert.strictEqual(a, undefined)
  content = content.replace(
    /expect\((.*?)\)\.toBeUndefined\(\)/g,
    'assert.strictEqual($1, undefined)'
  )
  // expect(a).toBeDefined() -> assert.notStrictEqual(a, undefined)
  content = content.replace(
    /expect\((.*?)\)\.toBeDefined\(\)/g,
    'assert.notStrictEqual($1, undefined)'
  )
  // expect(a).toBeTruthy() -> assert.ok(a)
  content = content.replace(/expect\((.*?)\)\.toBeTruthy\(\)/g, 'assert.ok($1)')
  // expect(a).toBeFalsy() -> assert.ok(!$1)
  content = content.replace(/expect\((.*?)\)\.toBeFalsy\(\)/g, 'assert.ok(!$1)')
  // expect(a).toContain(b) -> assert.ok($1.includes($2))
  content = content.replace(/expect\((.*?)\)\.toContain\((.*?)\)/g, 'assert.ok($1.includes($2))')
  // expect(a).toMatch(b) -> assert.match(String($1), $2)
  content = content.replace(/expect\((.*?)\)\.toMatch\((.*?)\)/g, 'assert.match(String($1), $2)')
  // expect(a).toThrow(b) -> assert.throws(() => {a}, b)
  content = content.replace(
    /expect\(\(\) => (.*?)\)\.toThrow\((.*?)\)/g,
    'assert.throws(() => $1, $2)'
  )

  // jest.fn() -> mock.fn()
  content = content.replace(/jest\.fn\(/g, 'mock.fn(')

  if (content.includes('mock.fn(')) {
    hasNodeTest = true
  }

  let imports = ''
  if (hasNodeTest) {
    const methods = []
    if (content.includes('describe(')) methods.push('describe')
    if (content.includes('it(')) methods.push('it')
    if (content.includes('test(')) methods.push('test')
    if (content.includes('beforeEach(')) methods.push('beforeEach')
    if (content.includes('afterEach(')) methods.push('afterEach')
    if (content.includes('beforeAll(')) methods.push('before')
    if (content.includes('afterAll(')) methods.push('after')
    if (content.includes('mock.fn(')) methods.push('mock')

    // Replace beforeAll and afterAll
    content = content.replace(/beforeAll\(/g, 'before(')
    content = content.replace(/afterAll\(/g, 'after(')

    if (methods.length > 0) {
      imports += `import { ${Array.from(new Set(methods)).join(', ')} } from 'node:test'\n`
    }
  }

  if (hasAssert) {
    imports += `import assert from 'node:assert/strict'\n`
  }

  if (imports) {
    content = imports + '\n' + content
  }

  fs.writeFileSync(filePath, content)
}

function walkDir(d) {
  const files = fs.readdirSync(d)
  for (const file of files) {
    const fullPath = path.join(d, file)
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath)
    } else if (fullPath.endsWith('.test.js')) {
      processFile(fullPath)
    }
  }
}

walkDir(dir)
